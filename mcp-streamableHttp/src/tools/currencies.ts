
  import { McpToolDefinition } from "./index.js";

  export const currenciesToolsMap: Map<string, McpToolDefinition> = new Map([
    
  ["getallcurrencies", {
    name: "getallcurrencies",
    description: `Fetch all currencies.
`,
    inputSchema: {"type":"object","properties":{"page[offset]":{"type":"string","description":"The number of records to offset the results by."},"page[limit]":{"type":"string","description":"The number of records per page."}}},
    method: "get",
    pathTemplate: "/v2/currencies",
    executionParameters: [{"name":"page[offset]","in":"query"},{"name":"page[limit]","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["createacurrency", {
    name: "createacurrency",
    description: `Create a currency.
`,
    inputSchema: {"type":"object","properties":{"requestBody":{"allOf":[{"title":"Request.CreateCurrencies","type":"object","properties":{"data":{"required":["type","code","exchange_rate","format","decimal_point","thousand_separator","decimal_places","default","enabled"],"type":"object","properties":{"code":{"description":"Specifies the currency code. Example YEN.","type":"string","example":"GBP","maxLength":3,"minLength":3},"decimal_places":{"description":"Indicates how many decimal places the currency is formatted to.","type":"number","example":2,"minimum":0},"decimal_point":{"description":"Indicates the decimal point character.","type":"string","example":"."},"default":{"description":"Specifies whether this is the default currency or not. Either `true` or `false`.","type":"boolean","example":true},"enabled":{"description":"Specifies if this currency is available for products. Either `true` or `false`.","type":"boolean","example":true},"exchange_rate":{"description":"Specifies the exchange rate from the default currency.","type":"number","example":1,"minimum":0},"format":{"description":"Specifies how the price currency is displayed. For example, \"¥{price}\".","type":"string","example":"£{price}"},"thousand_separator":{"description":"Indicates the thousand separator character.","type":"string","example":","},"type":{"description":"Represents the type represents the object being returned.","type":"string","example":"currency"}}}}},{"example":[{"data":{"code":"GBP","decimal_places":2,"decimal_point":".","default":true,"enabled":true,"exchange_rate":1,"format":"£{price}","thousand_separator":",","type":"currency"}}]}],"description":"The JSON request body."}}},
    method: "post",
    pathTemplate: "/v2/currencies",
    executionParameters: [],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["getacurrency", {
    name: "getacurrency",
    description: `Fetch a currency by its ID.
`,
    inputSchema: {"type":"object","properties":{"currencyID":{"type":"string","description":"The ID for the requested currency."}},"required":["currencyID"]},
    method: "get",
    pathTemplate: "/v2/currencies/{currencyID}",
    executionParameters: [{"name":"currencyID","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["updateacurrency", {
    name: "updateacurrency",
    description: `Update a currency.
`,
    inputSchema: {"type":"object","properties":{"currencyID":{"type":"string","description":"The ID for the requested currency."},"requestBody":{"allOf":[{"type":"object","properties":{"data":{"title":"Data.UpdateCurrencies","type":"object","properties":{"default":{"description":"Specifies whether this is the default currency or not. Either `true` or `false`.","type":"boolean","example":true}}}}},{"example":[{"data":{"default":true}}]}],"description":"The JSON request body."}},"required":["currencyID"]},
    method: "put",
    pathTemplate: "/v2/currencies/{currencyID}",
    executionParameters: [{"name":"currencyID","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ["deleteacurrency", {
    name: "deleteacurrency",
    description: `Delete a currency.

:::caution

- You can’t delete a default currency.

:::
`,
    inputSchema: {"type":"object","properties":{"currencyID":{"type":"string","description":"The ID for the Currency to delete."}},"required":["currencyID"]},
    method: "delete",
    pathTemplate: "/v2/currencies/{currencyID}",
    executionParameters: [{"name":"currencyID","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"bearerAuth":[]}]
  }],
  ]);

  