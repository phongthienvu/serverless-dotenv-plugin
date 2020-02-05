'use strict'

const chalk = require('chalk')
const fs = require('fs')
const path = require('path')

class ServerlessPlugin {
  constructor(serverless, options) {
    this.serverless = serverless
    this.serverless.service.provider.environment =
      this.serverless.service.provider.environment || {}
    this.config =
      this.serverless.service.custom && this.serverless.service.custom['dotenv']
    this.logging =
      this.config && typeof this.config.logging !== 'undefined'
        ? this.config.logging
        : true

    this.loadEnv(this.getEnvironment(options))
  }

  getEnvironment(options) {
    if (process.env.NODE_ENV) {
      return process.env.NODE_ENV
    }

    if (options.env) {
      return options.env
    }

    return 'development'
  }

  resolveEnvFileName(env) {
    if (this.config && this.config.path) {
      return this.config.path
    }

    let basePath =
      this.config && this.config.basePath ? this.config.basePath : process.cwd()

    let defaultPath = path.resolve(basePath, '.env')
    let envPath = path.resolve(basePath, '.env.' + env)

    return fs.existsSync(envPath) ? envPath : defaultPath
  }

  resolvePluginConfigPath() {
    let basePath =
      this.config && this.config.basePath ? this.config.basePath : process.cwd()
    let pluginConfigName = 'dotenv.config.js'
    let defaultPluginConfigPath = path.resolve(__dirname, pluginConfigName)
    let pluginConfigPath = path.resolve(basePath, pluginConfigName)

    return fs.existsSync(pluginConfigPath)
      ? pluginConfigPath
      : defaultPluginConfigPath
  }

  loadEnv(env) {
    var envFileName = this.resolveEnvFileName(env)
    console.log(envFileName)
    var pluginConfigPath = this.resolvePluginConfigPath()

    try {
      let envVars = require(pluginConfigPath)(envFileName)

      var include = false
      var exclude = false

      if (this.config && this.config.include) {
        include = this.config.include
      }

      if (this.config && this.config.exclude && !include) {
        // Don't allow both include and exclude to be specified
        exclude = this.config.exclude
      }

      if (envVars) {
        if (this.logging) {
          this.serverless.cli.log(
            'DOTENV: Loading environment variables from ' + envFileName + ':'
          )
        }
        if (include) {
          Object.keys(envVars)
            .filter(key => !include.includes(key))
            .forEach(key => {
              delete envVars[key]
            })
        }
        if (exclude) {
          Object.keys(envVars)
            .filter(key => exclude.includes(key))
            .forEach(key => {
              delete envVars[key]
            })
        }
        Object.keys(envVars).forEach(key => {
          if (this.logging) {
            this.serverless.cli.log('\t - ' + key)
          }
          this.serverless.service.provider.environment[key] = envVars[key]
        })
      } else {
        if (this.logging) {
          this.serverless.cli.log('DOTENV: Could not find .env file.')
        }
      }
    } catch (e) {
      console.error(
        chalk.red(
          '\n Serverless Plugin Error --------------------------------------\n'
        )
      )
      console.error(chalk.red('  ' + e.message))
    }
  }
}

module.exports = ServerlessPlugin
