/*
 * Licensed to Laurent Broudoux (the "Author") under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership. Author licenses this
 * file to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import React, { useEffect, useState } from 'react';
import { APP_CONTAINER } from '../utils/constants';
import { useDockerDesktopClient } from '../utils/ddclient';

import { ExtensionConfig } from '../types/ExtensionConfig';
import MockURLRow from './MockURLRow';
import ServiceType from './ServiceType';

type Service = {
  id: string;
  name: string;
  version: string;
  type: string;
  operations: Operation[];
};

type Operation = {
  name: string;
  method: string;
  dispatcher: string;
  dispatcherRules: string;
  resourcePaths: string[];
};

const Services = (props: { config: ExtensionConfig }) => {
  const [services, setServices] = useState<Service[]>([]);

  const { config } = props;

  const ddClient = useDockerDesktopClient();

  const getServices = async () => {
    const result = await ddClient.docker.cli.exec('exec', [
      APP_CONTAINER,
      '/bin/curl',
      '-s',
      '-S',
      'localhost:8080/api/services',
    ]);
    if (result?.stderr) {
      console.error(result.stderr);
      return;
    }
    const svcs = result?.parseJsonObject() as Service[];
    console.log(svcs);
    setServices(svcs);
  };

  const encodeUrl = (url: string): string => {
    return url.replace(/\s/g, '+');
  };

  const formatMockUrl = (
    service: Service,
    operation: Operation,
    path?: string,
  ): string => {
    var result = `http://localhost:${8080 + config.portOffset}`;

    if (service.type === 'REST') {
      result += '/rest/';
      result += encodeUrl(service.name) + '/' + service.version;
      result += path;
    } else if (service.type === 'SOAP_HTTP') {
      result += '/soap/';
      result += encodeUrl(service.name) + '/' + service.version;
    } else if (service.type === 'GRAPHQL') {
      result += '/graphql/';
      result += encodeUrl(service.name) + '/' + service.version;
    } else if (service.type === 'GENERIC_REST') {
      result += '/dynarest/';
      result += encodeUrl(service.name) + '/' + service.version;
    } else if (service.type === 'GRPC') {
      result = `http://localhost:${9090 + config.portOffset}`;
    }

    return result;
  };

  useEffect(() => {
    getServices();
  }, []);

  const Row = (props: { row: Service }) => {
    const [open, setOpen] = React.useState(false);

    const { row } = props;

    return (
      <React.Fragment>
        <TableRow sx={{ '& > *': { borderBottom: 'none' } }}>
          <TableCell width="5%">
            <IconButton
              aria-label="expand row"
              size="small"
              onClick={() => setOpen(!open)}
            >
              {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
            </IconButton>
          </TableCell>
          <TableCell component="th" scope="row">
            <Typography variant="subtitle1" component="span">
              {row.name}
            </Typography>
          </TableCell>
          <TableCell width="20%" align="left">
            <ServiceType type={row.type}></ServiceType>
          </TableCell>
          <TableCell width="20%" align="left">
            <Typography component="span">Version: {row.version}</Typography>
          </TableCell>
          <TableCell width="20%" align="right">
            <Button
              variant="text"
              onClick={() =>
                ddClient.host.openExternal(
                  `http://localhost:${8080 + config.portOffset}/#/services/${
                    row.id
                  }`,
                )
              }
            >
              Details
            </Button>
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={5}>
            <Collapse in={open} timeout="auto" unmountOnExit>
              <Box margin={1} paddingBottom={2}>
                <TableContainer>
                  <Table size="small" aria-label="operations">
                    <TableHead>
                      <TableRow>
                        <TableCell>Method</TableCell>
                        <TableCell>Path</TableCell>
                        <TableCell>Mock URL</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {row.operations
                        .sort((a, b) => a.name.length - b.name.length)
                        .map((operation) => (
                          <TableRow key={operation.name}>
                            <TableCell component="th" scope="row">
                              <Typography
                                fontWeight="bold"
                                variant="h6"
                                sx={{
                                  borderRadius: '0',
                                  color:
                                    operation.method == 'GET'
                                      ? 'green'
                                      : operation.method == 'POST'
                                      ? '#ec7a08'
                                      : operation.method == 'DELETE'
                                      ? '#c00'
                                      : '#39a5dc',
                                }}
                              >
                                {operation.method}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body1" component="span">
                                {operation.name.replace(operation.method, '')}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {row.type.includes('EVENT') &&
                              !config.asyncEnabled ? (
                                <Box
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    flexWrap: 'wrap',
                                  }}
                                >
                                  <WarningAmberIcon />
                                  <Typography
                                    variant="body1"
                                    component="span"
                                    marginLeft={1}
                                  >
                                    Async APIs are disabled
                                  </Typography>
                                </Box>
                              ) : operation.resourcePaths ? (
                                <List>
                                  {operation.resourcePaths.map(
                                    (path, index) => (
                                      <ListItem key={index} disablePadding>
                                        <MockURLRow
                                          mockURL={formatMockUrl(
                                            row,
                                            operation,
                                            path,
                                          )}
                                        />
                                      </ListItem>
                                    ),
                                  )}
                                </List>
                              ) : (
                                <>
                                  <MockURLRow
                                    mockURL={formatMockUrl(
                                      row,
                                      operation,
                                    )}
                                  />
                                </>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      </React.Fragment>
    );
  };

  return (
    <Box sx={{ width: '100%', alignItems: 'center' }} my={5}>
      <Typography variant="h3">Services</Typography>
      <Box my={2}>
        <Stack>
          <TableContainer>
            <Table aria-label="collapsible table">
              <TableBody>
                {services.map((service) => (
                  <Row key={service.id} row={service} />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      </Box>
    </Box>
  );
};

export default Services;
