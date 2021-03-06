/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import ReactDom from 'react-dom';
import 'focus-visible/dist/focus-visible';

import { ChakraProvider, useInterval } from '@chakra-ui/react';

import {
  getStatus,
  getUpTimeAndVersion,
  initializeIpcRendererSide,
  parseGeneralInfos,
  parseStateResults,
  POLLING_GENERAL_INFOS_INTERVAL_MS,
  POLLING_STATUS_INTERVAL_MS
} from '../ipc/ipc_renderer';
import { updateFromDaemonStatus } from '../features/statusSlice';
import { Provider } from 'react-redux';
import { store } from './store';
import { useAppDispatch } from './hooks';
import { updateFromDaemonGeneralInfos } from '../features/generalInfosSlice';
import { markExitNodesFromDaemon } from '../features/exitStatusSlice';
import { AppLayout } from './components/AppLayout';

const mainElement = document.createElement('div');
document.body.appendChild(mainElement);

initializeIpcRendererSide();

const App = () => {
  // dispatch is used to make updates to the redux store
  const dispatch = useAppDispatch();
  // console.info('state', state);

  // register an interval for fetching the status of the daemon
  useInterval(async () => {
    // getStatus sends an IPC call to our node environment
    // once on the node environment, it will trigger and wait for the RPC call to finish
    // or timeout before returning.
    const statusAsString = await getStatus();
    // The status we get is a plain string. Extract the details we care from it and build
    // the state we will send as update to the redux store
    const parsedStatus = parseStateResults(statusAsString);

    // Send the update to the redux store.
    dispatch(updateFromDaemonStatus({ daemonStatus: parsedStatus }));
    dispatch(
      markExitNodesFromDaemon({
        exitNodeFromDaemon: parsedStatus.exitNode,
        exitAuthCodeFromDaemon: parsedStatus.exitAuthCode
      })
    );
  }, POLLING_STATUS_INTERVAL_MS);

  // register an interval for fetching the version and uptime of the daemon.
  // Note: With react, no refresh is triggered if the change made does not make a change
  useInterval(async () => {
    const generalInfos = await getUpTimeAndVersion();
    const parsedInfos = parseGeneralInfos(generalInfos);
    dispatch(updateFromDaemonGeneralInfos({ generalsInfos: parsedInfos }));
  }, POLLING_GENERAL_INFOS_INTERVAL_MS);

  return (
    <ChakraProvider resetCSS={true}>
      <AppLayout />
    </ChakraProvider>
  );
};

// Make the Redux store available to all sub components of <App/>
ReactDom.render(
  <Provider store={store}>
    <App />
  </Provider>,
  mainElement
);
