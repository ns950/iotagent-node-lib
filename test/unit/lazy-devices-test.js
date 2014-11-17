/*
 * Copyright 2014 Telefonica Investigación y Desarrollo, S.A.U
 *
 * This file is part of fiware-iotagent-lib
 *
 * fiware-iotagent-lib is free software: you can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 *
 * fiware-iotagent-lib is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public
 * License along with fiware-iotagent-lib.
 * If not, seehttp://www.gnu.org/licenses/.
 *
 * For those usages not covered by the GNU Affero General Public License
 * please contact with::[contacto@tid.es]
 */
'use strict';

var iotAgentLib = require('../../'),
    utils = require('../tools/utils'),
    should = require('should'),
    logger = require('fiware-node-logger'),
    nock = require('nock'),
    request = require('request'),
    contextBrokerMock,
    iotAgentConfig = {
        contextBroker: {
            host: '10.11.128.16',
            port: '1026'
        },
        server: {
            port: 4041
        },
        types: {
            'Light': {
                commands: [],
                lazy: [
                    {
                        name: 'temperature',
                        type: 'centigrades'
                    }
                ],
                active: [
                    {
                        name: 'pressure',
                        type: 'Hgmm'
                    }
                ]
            },
            'Termometer': {
                commands: [],
                lazy: [
                    {
                        name: 'temp',
                        type: 'kelvin'
                    }
                ],
                active: [
                ]
            }
        },
        service: 'smartGondor',
        subservice: 'gardens',
        providerUrl: 'http://smartGondor.com',
        deviceRegistrationDuration: 'P1M',
        throttling: 'PT5S'
    },
    device1 = {
        id: 'light1',
        type: 'Light'
    };

describe('IoT Agent Lazy Devices and Commands', function() {
    beforeEach(function() {
        logger.setLevel('FATAL');
    });

    afterEach(function(done) {
        iotAgentLib.deactivate(done);
    });

    describe('When the IoT Agent receives an update on the device data', function() {
        var options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/NGSI10/updateContext',
            method: 'POST',
            json: {
                contextElements: [
                    {
                        type: 'Light',
                        isPattern: 'false',
                        id: 'light1',
                        attributes: [
                            {
                                name: 'dimming',
                                type: 'Percentage',
                                value: 12
                            }
                        ]
                    }
                ],
                updateAction: 'APPEND'
            }
        };

        beforeEach(function(done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://10.11.128.16:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/NGSI9/registerContext',
                    utils.readExampleFile('./test/unit/contextAvailabilityRequests/registerIoTAgent1.json'))
                .reply(200,
                    utils.readExampleFile('./test/unit/contextAvailabilityResponses/registerIoTAgent1Success.json'));

            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('should call the device handler with the received data', function(done) {
            var expectedResponse = utils
                .readExampleFile('./test/unit/contextProviderResponses/updateInformationResponse.json');

            iotAgentLib.setDataUpdateHandler(function(id, type, attributes, callback) {
                id.should.equal(device1.id);
                type.should.equal(device1.type);
                attributes[0].value.should.equal(12);
                callback(null);
            });

            request(options, function(error, response, body) {
                should.not.exist(error);
                body.should.eql(expectedResponse);
                done();
            });
        });
    });

    describe('When a IoT Agent receives an update on multiple contexts', function() {
        it('should call the device handler for each of the contexts');
    });

    describe('When a notification of a change in a device arrives to the IoT Agent', function() {
        var options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/notification',
            method: 'POST',
            json: {
                subscriptionId: '51c0ac9ed714fb3b37d7d5a8',
                originator: 'localhost',
                contextResponses: [
                    {
                        contextElement: {
                            attributes: [
                                {
                                    name: 'dimming',
                                    type: 'Percentage',
                                    value: 12
                                }
                            ],
                            type: 'Light',
                            isPattern: 'false',
                            id: 'light1'
                        },
                        statusCode: {
                            code: '200',
                            reasonPhrase: 'OK'
                        }
                    }
                ]
            }
        };

        beforeEach(function(done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://10.11.128.16:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/NGSI9/registerContext',
                    utils.readExampleFile('./test/unit/contextAvailabilityRequests/registerIoTAgent1.json'))
                .reply(200,
                    utils.readExampleFile('./test/unit/contextAvailabilityResponses/registerIoTAgent1Success.json'));

            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('should call the device update handler for the device', function(done) {
            var expectedResponse = utils
                .readExampleFile('./test/unit/contextProviderResponses/updateInformationResponse.json');

            iotAgentLib.setDataUpdateHandler(function(id, type, attributes, callback) {
                id.should.equal(device1.id);
                type.should.equal(device1.type);
                attributes[0].value.should.equal(12);
                callback(null);
            });

            request(options, function(error, response, body) {
                should.not.exist(error);
                body.should.eql(expectedResponse);
                done();
            });
        });
    });

    describe('When a context query arrives to the IoT Agent', function() {
        var options = {
                url: 'http://localhost:' + iotAgentConfig.server.port + '/NGSI10/queryContext',
                method: 'POST',
                json: {
                    entities: [
                        {
                            type: 'Light',
                            isPattern: 'false',
                            id: 'light1'
                        }
                    ],
                    attributes: [
                        'dimming'
                    ]
                }
            },
            sensorData = [
                {
                    id: 'light1',
                    type: 'Light',
                    attributes: [
                        {
                            name: 'dimming',
                            type: 'Percentage',
                            value: 19
                        }
                    ]
                }
            ];

        beforeEach(function(done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://10.11.128.16:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/NGSI9/registerContext',
                    utils.readExampleFile('./test/unit/contextAvailabilityRequests/registerIoTAgent1.json'))
                .reply(200,
                    utils.readExampleFile('./test/unit/contextAvailabilityResponses/registerIoTAgent1Success.json'));

            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('should return the information querying the underlying devices', function(done) {
            var expectedResponse = utils
                .readExampleFile('./test/unit/contextProviderResponses/queryInformationResponse.json');

            iotAgentLib.setDataQueryHandler(function(id, type, attributes, callback) {
                id.should.equal(device1.id);
                type.should.equal(device1.type);
                attributes[0].should.equal('dimming');
                callback(null, sensorData);
            });

            request(options, function(error, response, body) {
                should.not.exist(error);
                body.should.eql(expectedResponse);
                done();
            });
        });
    });
});