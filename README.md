# Integración de PBX Asterisk y Node.js con Dashboard de Agentes

Este proyecto es una solución que integra un servidor Node.js (usando Express y Socket.io) con una PBX Asterisk (en este ejemplo, VitalPBX) para gestionar agentes que se autentican y reciben comandos en tiempo real. La idea es que, cuando un anexo (que corresponde al agente) contesta una llamada, la PBX invoque un webhook que llame a la API de Node.js. Este evento provoca la apertura de una nueva pestaña en el navegador del agente, y se registra en el dashboard (junto con la fecha y hora de ejecución).

## Características

- **Login de Agentes**:  
  Los agentes se autentican mediante un formulario (con Bootstrap) utilizando credenciales almacenadas en un archivo CSV.

- **Dashboard en Tiempo Real**:  
  Una vez autenticados, los agentes son redirigidos a un dashboard que muestra en vivo un log de las acciones recibidas (por ejemplo, la apertura de nuevas pestañas con información de llamadas).

- **Integración con Asterisk (VitalPBX)**:  
  Cuando un anexo contesta una llamada, el dialplan de la PBX ejecuta un webhook que invoca la API `/asterisk-call` en el servidor Node.js. Este endpoint, protegido por un API Key, identifica al agente y envía un comando para abrir una URL en su navegador.

- **Registro de Eventos**:  
  El servidor Node.js registra en la consola (con fecha y hora) eventos relevantes, tales como intentos de login, desconexiones, invocaciones de la API y llamadas de Asterisk.
