# zxinfo-es
Create Elasticsearch instance with documents created from ZXDB.

This is the data backend for [ZXInfo App](http://sinclair.kolbeck.dk) using Elasticsearch.

It is written in NodeJS and requires the following:
* Node.js
* zxinfo-db - MariaDB populated with ZXDB data - [github](https://github.com/thomasheckmann/zxinfo-services)

# Installation
To install all required modules, type
````
> npm install
````

Create Elasticsearch mappings
````
> (cd ZXInfoArchive/scripts/ && ./createGameIndex.sh)
````

Start your MariaDB with ZXDB data as described on [github](https://github.com/thomasheckmann/zxinfo-services)

Generate JSON documents, the document will be save in 'data/processed/json'
````
> node create-zxinfo-documents
````

After finish, import into Elasticsearch
````
> node import-into-elastic.js data/processed/json/
````

## 02-2017
* Fixed a problem with wrong publisher in 'series'
* Added Other systems info
* Added Authored/Authoring