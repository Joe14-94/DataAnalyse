/// <reference types="vite/client" />

/**
 * Logger utilitaire pour l'application.
 * Masque les logs en production pour éviter de polluer la console.
 */
export const logger = {
  log: (message: any, ...args: any[]) => {
    if (import.meta.env.DEV) {
      console.log(message, ...args);
    }
  },
  warn: (message: any, ...args: any[]) => {
    if (import.meta.env.DEV) {
      console.warn(message, ...args);
    }
  },
  error: (message: any, ...args: any[]) => {
    console.error(message, ...args);
  },
  info: (message: any, ...args: any[]) => {
    if (import.meta.env.DEV) {
      console.info(message, ...args);
    }
  },
  debug: (message: any, ...args: any[]) => {
    if (import.meta.env.DEV) {
      console.debug(message, ...args);
    }
  }
};
