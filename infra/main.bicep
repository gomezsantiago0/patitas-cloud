targetScope = 'resourceGroup'

@description('Entorno de despliegue.')
@allowed([
  'dev'
  'prod'
])
param entorno string

@description('Región del grupo de recursos y de la base de datos.')
param ubicacion string = 'mexicocentral'

@description('Región del Static Web App. No todas las regiones lo soportan y la suscripción de estudiante restringe algunas.')
param ubicacionSwa string = 'eastus2'

@description('Región de Log Analytics y Application Insights.')
param ubicacionMonitoreo string = ubicacion

var sufijo = take(uniqueString(resourceGroup().id), 6)
var nombreBaseDatos = 'patitas'
var nombreContenedor = 'citas'
var etiquetas = {
  proyecto: 'patitas-cloud'
  entorno: entorno
}

resource espacioLogs 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: 'log-patitas-${entorno}'
  location: ubicacionMonitoreo
  tags: etiquetas
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
    workspaceCapping: {
      dailyQuotaGb: 1
    }
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: 'appi-patitas-${entorno}'
  location: ubicacionMonitoreo
  tags: etiquetas
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: espacioLogs.id
    IngestionMode: 'LogAnalytics'
  }
}

resource cosmos 'Microsoft.DocumentDB/databaseAccounts@2024-05-15' = {
  name: 'cosmos-patitas-${entorno}-${sufijo}'
  location: ubicacion
  tags: etiquetas
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    capabilities: [
      {
        name: 'EnableServerless'
      }
    ]
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    locations: [
      {
        locationName: ubicacion
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]
    minimalTlsVersion: 'Tls12'
    publicNetworkAccess: 'Enabled'
  }
}

resource baseDatos 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2024-05-15' = {
  parent: cosmos
  name: nombreBaseDatos
  properties: {
    resource: {
      id: nombreBaseDatos
    }
  }
}

resource contenedorCitas 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: baseDatos
  name: nombreContenedor
  properties: {
    resource: {
      id: nombreContenedor
      partitionKey: {
        paths: [
          '/fecha'
        ]
        kind: 'Hash'
      }
    }
  }
}

resource sitioWeb 'Microsoft.Web/staticSites@2023-12-01' = {
  name: 'swa-patitas-${entorno}'
  location: ubicacionSwa
  tags: etiquetas
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {
    stagingEnvironmentPolicy: 'Enabled'
    allowConfigFileUpdates: true
  }
}

resource configuracionSitio 'Microsoft.Web/staticSites/config@2023-12-01' = {
  parent: sitioWeb
  name: 'appsettings'
  properties: {
    COSMOS_CONNECTION_STRING: cosmos.listConnectionStrings().connectionStrings[0].connectionString
    COSMOS_DATABASE: nombreBaseDatos
    COSMOS_CONTAINER: nombreContenedor
    APPLICATIONINSIGHTS_CONNECTION_STRING: appInsights.properties.ConnectionString
  }
}

output nombreSitioWeb string = sitioWeb.name
output direccionSitioWeb string = sitioWeb.properties.defaultHostname
output nombreCosmos string = cosmos.name
output nombreAppInsights string = appInsights.name