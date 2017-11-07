# Nemis
A national education management information system.

The system is built with nodejs and mongodb.
### Installation and running
Once you clone/download the source code, navigate to the root folder of this project in your terminal and run (_you must have nodejs and npm installed_) :

`npm install`


to install all the dependencies.

You also need to install mongodb and create a database called nemis.

### Folder structure
On the root folder, the only important files are **app.js** and **package.js**. You can ignore the others. 

**app.js** is the entry point to the application. This is the file you will run to start the server, and it also contains the APIs.

**databases** folder contains a **schemas.js** file which contains the structure of various mongodb documents (tables in MySQL) used to store data.

**public** folder contains content that is to be served to the user, or uploaded by the user. This is where you place your **vue.js**/**react.js** etc files and other front-end stuff like  custom css and html. This folder contains a folder called **pug**. Pug is the new name for **jade**. You can go through each pug file in there to have a clue of how the front-end will consume the APIs. **Do not follow it to the letter though. The API has been updated to receive and respond through json object only. Use the pug files to know what various routes do**

### Recommended IDE
This project is developed using Webstorm. It is highly recommended you use it also.

### Work in progress
The project as it is is usable. You can use it to develop a front end. Some key features missing at the moment, but will definitely be added include testing framework, better module system, encryption/hashing of passwords, a complete system admin API system, polishing, robust validation, etc. 

## API

To access the documentation for the API, visit `http://localhost:3000/front_end/api.html` in your browser to access the documentation.

