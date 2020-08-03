# (Re-)Create ZXINFO database
The following steps are required for creating a new ZXINFO backend

- Synchronize files from [spectrumcomputing](spectrumcomputing.co.uk)
- Download latest ZXDB release from [github](https://github.com/zxdb/ZXDB/archive/master.zip)
- Populate mariaDB with ZXDB
- Create entries, mappings and import
- Convert entry screenshots, import screenshots info
- Create magazines, mappings and import
- Test ZXInfo application

Requirements for this guide:
- Docker, used for instances of mariaDB and Elasticsearch
- nodeJS, used by scripts for creating and importing data
- php, used by script for convert screenshots from .scr to png/gif
- - [zximage](https://github.com/moroz1999/zx-image)
- - [GifCreator](https://github.com/Sybio/GifCreator)
	

# Synchronize files from SpectrumComputing
Only files added as part of ZXDB updates are required, which can be downloaded from "https://spectrumcomputing.co.uk/zxdb/".

# Download latest ZXDB
Latest ZXDB are available on it's [github page](https://github.com/zxdb/ZXDB) together with detailed documentation.

# Populate mariaDB
Copy the files `ZXDB_mysql.sql` and `ZXDB_help_search.sql` from ZXDB.

If upgrading from an existing mariaDB instance, cleanup is required:

```
docker stop zxdb && docker rm zxdb && rm -rf mariadb
```

Now build and run mariaDB, populate with ZXDB and run myPhpAdmin using docker containers(remember to change password *zxdb1234* to something more secure)
```
docker build . -t zxinfo_db:2.0
docker run --name zxdb -p 3306:3306 -v $PWD/mariadb:/var/lib/mysql -e MYSQL_ROOT_PASSWORD=zxdb1234 -d zxinfo_db:2.0

docker run --name myadmin -d --link zxdb:db -p 8080:80 phpmyadmin/phpmyadmin
```
myPhpAdmin can be accessed in browser at [localhost](http://localhost:8080/) and login with the credential used above.

# Create entries, mappings and import
Before creating documents cleanup is recommended:


## entries
```
# clean-up
find data/processed/ -type f -name "*.json" -exec rm -rf {} \;

# create JSON documents for entries
node --max-old-space-size=8192 create-zxinfo-documents.js --all 2> zxscreens.txt
```

```
NOTE:
- Running the create-zxinfo-documents is known to fail, but all documents are created
- zxscreens.txt contains filenames for screenshots that needs to be converted (later step)
```
All created JSON documents can now be found in `data/processed/json/`

## mappings and import
A running instance of Elasticsearch must be running, for example the setup supplied with ZXInfo-App:

`docker-compose run --service-ports -d zxinfo-es`

and if upgrading a cleanup is recommended:

`curl -XDELETE 'http://localhost:9200/_all'`

To create ES mappings and import JSON files:

```
(cd ZXInfoArchive/scripts/ && ./entries.sh)
```

# Convert entry screenshots

Screenshot references in the zxscreen.txt file (create when generation JSON documents) needs to be converted from .scr to .png/gif (.gif if flash is used).

First some cleanup: `find UpdateScreens/json/ -type f -name "*.json" -exec rm -rf {} \;`

To convert screenshots and import required addtional info:
```
(cd UpdateScreens && php convert.php) && node update-new-screens.js UpdateScreens/json/
```

# Create magazines, mappings and import
Before creating documents cleanup is recommended:


## entries
```
# clean-up
find data/magazines/ -type f -name "*.json" -exec rm -rf {} \;

# create JSON documents for entries
node --max-old-space-size=8192 create-magazine-documents.js
```

All created JSON documents can now be found in `data/magazines/json/`

## mappings and import
A running instance of Elasticsearch must be running, for example the setup supplied with ZXInfo-App: `docker-compose run --service-ports -d zxinfo-es` and if upgrading a cleanup is recommended: `curl -XDELETE 'http://localhost:9200/_all'`

To create ES mappings and import JSON files:

```
(cd ZXInfoArchive/scripts/ && ./magazines.sh)
```

**You should now have a complete up to date Elasticsearch with ZXDB**


# Starting local test

````
zxinfo-neo4j (in zxapp-app)
	docker-compose run --service-ports -d zxinfo-neo4j

zxinfo-app
	NODE_ENV=development nodemon --ignore public/javascripts/config.js

zxinfo-service
	NODE_ENV=development PORT=8300 nodemon --ignore public/javascripts/config.js
````

LAUNCH ZXInfo - http://localhost:3000/#!/home
