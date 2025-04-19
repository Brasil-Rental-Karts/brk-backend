#!/usr/bin/env node
/**
 * This script generates an Insomnia REST client collection with all API endpoints.
 * 
 * Usage: node scripts/generate-insomnia-collection.js > insomnia-collection.json
 */

const fs = require('fs');
const path = require('path');

// Get all entity files
const modelsDir = path.join(__dirname, '..', 'src', 'models');
const entityFiles = fs.readdirSync(modelsDir)
  .filter(file => file.endsWith('.entity.ts') && file !== 'base.entity.ts');

// Convert kebab-case to camelCase
function kebabToCamel(str) {
  return str.replace(/-([a-z])/g, g => g[1].toUpperCase());
}

// Convert PascalCase to plural endpoints
function pascalToPluralEndpoint(str) {
  // First convert to kebab case
  const kebab = str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  // Then convert to camel case
  const camel = kebabToCamel(kebab);
  // Pluralize (simplified)
  return `${camel}s`;
}

// Prepare collection structure
const collection = {
  _type: "export",
  __export_format: 4,
  __export_date: new Date().toISOString(),
  __export_source: "insomnia.desktop.app:v2023.4.0",
  resources: [
    {
      _id: "req_root",
      parentId: "wrk_brk_backend",
      modified: 1631643600000,
      created: 1631643600000,
      url: "{{ _.baseUrl }}",
      name: "Root",
      description: "",
      method: "GET",
      body: {},
      parameters: [],
      headers: [],
      authentication: {},
      metaSortKey: -1631643600000,
      isPrivate: false,
      settingStoreCookies: true,
      settingSendCookies: true,
      settingDisableRenderRequestBody: false,
      settingEncodeUrl: true,
      settingRebuildPath: true,
      settingFollowRedirects: "global",
      _type: "request"
    },
    {
      _id: "wrk_brk_backend",
      parentId: null,
      modified: 1631643600000,
      created: 1631643600000,
      name: "BRK Backend API",
      description: "API for the BRK backend application",
      scope: "collection",
      _type: "workspace"
    },
    // Auth endpoints
    {
      _id: "fld_auth",
      parentId: "wrk_brk_backend",
      modified: 1631643600000,
      created: 1631643600000,
      name: "Authentication",
      description: "Authentication endpoints",
      environment: {},
      environmentPropertyOrder: null,
      metaSortKey: -1631643600000,
      _type: "request_group"
    },
    {
      _id: "req_register",
      parentId: "fld_auth",
      modified: 1631643600000,
      created: 1631643600000,
      url: "{{ _.baseUrl }}/auth/register",
      name: "Register User",
      description: "Register a new user",
      method: "POST",
      body: {
        mimeType: "application/json",
        text: "{\n\t\"name\": \"Test User\",\n\t\"email\": \"test@example.com\",\n\t\"password\": \"password123\",\n\t\"phone\": \"+1234567890\"\n}"
      },
      parameters: [],
      headers: [
        {
          name: "Content-Type",
          value: "application/json"
        }
      ],
      authentication: {},
      metaSortKey: -1631643600000,
      isPrivate: false,
      settingStoreCookies: true,
      settingSendCookies: true,
      settingDisableRenderRequestBody: false,
      settingEncodeUrl: true,
      settingRebuildPath: true,
      settingFollowRedirects: "global",
      _type: "request"
    },
    {
      _id: "req_login",
      parentId: "fld_auth",
      modified: 1631643600000,
      created: 1631643600000,
      url: "{{ _.baseUrl }}/auth/login",
      name: "Login",
      description: "Login with email and password to get tokens",
      method: "POST",
      body: {
        mimeType: "application/json",
        text: "{\n\t\"email\": \"test@example.com\",\n\t\"password\": \"password123\"\n}"
      },
      parameters: [],
      headers: [
        {
          name: "Content-Type",
          value: "application/json"
        }
      ],
      authentication: {},
      metaSortKey: -1631643500000,
      isPrivate: false,
      settingStoreCookies: true,
      settingSendCookies: true,
      settingDisableRenderRequestBody: false,
      settingEncodeUrl: true,
      settingRebuildPath: true,
      settingFollowRedirects: "global",
      _type: "request"
    },
    {
      _id: "req_refresh_token",
      parentId: "fld_auth",
      modified: 1631643600000,
      created: 1631643600000,
      url: "{{ _.baseUrl }}/auth/refresh-token",
      name: "Refresh Token",
      description: "Refresh the access token using the refresh token",
      method: "POST",
      body: {
        mimeType: "application/json",
        text: "{\n\t\"refreshToken\": \"{{ _.refreshToken }}\"\n}"
      },
      parameters: [],
      headers: [
        {
          name: "Content-Type",
          value: "application/json"
        }
      ],
      authentication: {},
      metaSortKey: -1631643400000,
      isPrivate: false,
      settingStoreCookies: true,
      settingSendCookies: true,
      settingDisableRenderRequestBody: false,
      settingEncodeUrl: true,
      settingRebuildPath: true,
      settingFollowRedirects: "global",
      _type: "request"
    },
    {
      _id: "req_logout",
      parentId: "fld_auth",
      modified: 1631643600000,
      created: 1631643600000,
      url: "{{ _.baseUrl }}/auth/logout",
      name: "Logout",
      description: "Logout and invalidate the refresh token",
      method: "POST",
      body: {},
      parameters: [],
      headers: [],
      authentication: {
        type: "bearer",
        token: "{{ _.accessToken }}"
      },
      metaSortKey: -1631643300000,
      isPrivate: false,
      settingStoreCookies: true,
      settingSendCookies: true,
      settingDisableRenderRequestBody: false,
      settingEncodeUrl: true,
      settingRebuildPath: true,
      settingFollowRedirects: "global",
      _type: "request"
    },
    // Base environment
    {
      _id: "env_base",
      parentId: "wrk_brk_backend",
      modified: 1631643600000,
      created: 1631643600000,
      name: "Base Environment",
      data: {
        baseUrl: "http://localhost:3000",
        accessToken: "",
        refreshToken: ""
      },
      dataPropertyOrder: {
        "&": [
          "baseUrl",
          "accessToken", 
          "refreshToken"
        ]
      },
      color: null,
      isPrivate: false,
      metaSortKey: 1631643600000,
      _type: "environment"
    },
    {
      _id: "env_development",
      parentId: "env_base",
      modified: 1631643600000,
      created: 1631643600000,
      name: "Development",
      data: {
        baseUrl: "http://localhost:3000"
      },
      dataPropertyOrder: {
        "&": [
          "baseUrl"
        ]
      },
      color: "#00ff00",
      isPrivate: false,
      metaSortKey: 1631643600000,
      _type: "environment"
    },
    {
      _id: "env_production",
      parentId: "env_base",
      modified: 1631643600000,
      created: 1631643600000,
      name: "Production",
      data: {
        baseUrl: "https://api.brkcompetition.com"
      },
      dataPropertyOrder: {
        "&": [
          "baseUrl"
        ]
      },
      color: "#ff0000",
      isPrivate: false,
      metaSortKey: 1631643600000,
      _type: "environment"
    }
  ]
};

// Add entity folders and requests
let folderSortKey = -1631643590000;
entityFiles.forEach(entityFile => {
  // Extract entity name
  const entityName = entityFile.replace('.entity.ts', '');
  const pascalCase = entityName.split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
  const endpoint = pascalToPluralEndpoint(pascalCase);
  
  // Create folder for entity
  const folderId = `fld_${entityName.replace(/-/g, '_')}`;
  collection.resources.push({
    _id: folderId,
    parentId: "wrk_brk_backend",
    modified: 1631643600000,
    created: 1631643600000,
    name: pascalCase,
    description: `${pascalCase} management endpoints`,
    environment: {},
    environmentPropertyOrder: null,
    metaSortKey: folderSortKey,
    _type: "request_group"
  });
  folderSortKey += 10000;

  // Add list request
  collection.resources.push({
    _id: `req_${endpoint}_list`,
    parentId: folderId,
    modified: 1631643600000,
    created: 1631643600000,
    url: `{{ _.baseUrl }}/${endpoint}`,
    name: `List ${pascalCase}s`,
    description: `Get all ${endpoint}`,
    method: "GET",
    body: {},
    parameters: [],
    headers: [],
    authentication: {
      type: "bearer",
      token: "{{ _.accessToken }}"
    },
    metaSortKey: -1631643600000,
    isPrivate: false,
    settingStoreCookies: true,
    settingSendCookies: true,
    settingDisableRenderRequestBody: false,
    settingEncodeUrl: true,
    settingRebuildPath: true,
    settingFollowRedirects: "global",
    _type: "request"
  });

  // Add get by ID request
  collection.resources.push({
    _id: `req_${endpoint}_detail`,
    parentId: folderId,
    modified: 1631643600000,
    created: 1631643600000,
    url: `{{ _.baseUrl }}/${endpoint}/{% response 'body', 'req_${endpoint}_list', '$.[0].id' %}`,
    name: `Get ${pascalCase} Detail`,
    description: `Get details for a specific ${pascalCase.toLowerCase()}`,
    method: "GET",
    body: {},
    parameters: [],
    headers: [],
    authentication: {
      type: "bearer",
      token: "{{ _.accessToken }}"
    },
    metaSortKey: -1631643550000,
    isPrivate: false,
    settingStoreCookies: true,
    settingSendCookies: true,
    settingDisableRenderRequestBody: false,
    settingEncodeUrl: true,
    settingRebuildPath: true,
    settingFollowRedirects: "global",
    _type: "request"
  });

  // Add create request
  collection.resources.push({
    _id: `req_${endpoint}_create`,
    parentId: folderId,
    modified: 1631643600000,
    created: 1631643600000,
    url: `{{ _.baseUrl }}/${endpoint}`,
    name: `Create ${pascalCase}`,
    description: `Create a new ${pascalCase.toLowerCase()}`,
    method: "POST",
    body: {
      mimeType: "application/json",
      text: `{\n\t"name": "New ${pascalCase}",\n\t"description": "A description of the ${pascalCase.toLowerCase()}"\n}`
    },
    parameters: [],
    headers: [
      {
        name: "Content-Type",
        value: "application/json"
      }
    ],
    authentication: {
      type: "bearer",
      token: "{{ _.accessToken }}"
    },
    metaSortKey: -1631643500000,
    isPrivate: false,
    settingStoreCookies: true,
    settingSendCookies: true,
    settingDisableRenderRequestBody: false,
    settingEncodeUrl: true,
    settingRebuildPath: true,
    settingFollowRedirects: "global",
    _type: "request"
  });

  // Add update request
  collection.resources.push({
    _id: `req_${endpoint}_update`,
    parentId: folderId,
    modified: 1631643600000,
    created: 1631643600000,
    url: `{{ _.baseUrl }}/${endpoint}/{% response 'body', 'req_${endpoint}_list', '$.[0].id' %}`,
    name: `Update ${pascalCase}`,
    description: `Update an existing ${pascalCase.toLowerCase()}`,
    method: "PUT",
    body: {
      mimeType: "application/json",
      text: `{\n\t"name": "Updated ${pascalCase}",\n\t"description": "Updated description"\n}`
    },
    parameters: [],
    headers: [
      {
        name: "Content-Type",
        value: "application/json"
      }
    ],
    authentication: {
      type: "bearer",
      token: "{{ _.accessToken }}"
    },
    metaSortKey: -1631643450000,
    isPrivate: false,
    settingStoreCookies: true,
    settingSendCookies: true,
    settingDisableRenderRequestBody: false,
    settingEncodeUrl: true,
    settingRebuildPath: true,
    settingFollowRedirects: "global",
    _type: "request"
  });

  // Add delete request
  collection.resources.push({
    _id: `req_${endpoint}_delete`,
    parentId: folderId,
    modified: 1631643600000,
    created: 1631643600000,
    url: `{{ _.baseUrl }}/${endpoint}/{% response 'body', 'req_${endpoint}_list', '$.[0].id' %}`,
    name: `Delete ${pascalCase}`,
    description: `Delete a ${pascalCase.toLowerCase()}`,
    method: "DELETE",
    body: {},
    parameters: [],
    headers: [],
    authentication: {
      type: "bearer",
      token: "{{ _.accessToken }}"
    },
    metaSortKey: -1631643400000,
    isPrivate: false,
    settingStoreCookies: true,
    settingSendCookies: true,
    settingDisableRenderRequestBody: false,
    settingEncodeUrl: true,
    settingRebuildPath: true,
    settingFollowRedirects: "global",
    _type: "request"
  });
});

// Output the collection as JSON
console.log(JSON.stringify(collection, null, 2)); 