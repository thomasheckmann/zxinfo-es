# How to create the ZXINFO backend (elasticsearch)

The following steps are required for creating a new ZXINFO backend

- Synchronize files from [spectrumcomputing](spectrumcomputing.co.uk)

- Download latest ZXDB release from [github](https://github.com/zxdb/ZXDB/archive/master.zip)

- Populate mariaDB with ZXDB

- Create entries, mappings and import

- Convert entry screenshots, import screenshots info

- Create magazines, mappings and import

- Test ZXInfo application

Requirements for this guide:

- Docker - as everthing is containerized. Used to create container for mariaDB, myphpadmin and Elasticsearch

- nodeJS - required to run the scripts for creating and importing data into elasticsearch

- php 8 - required to run script for convert screenshots from .scr to png/gif. Required the following component as well:

  - [zximage](https://github.com/moroz1999/zx-image)

  - [GifCreator](https://github.com/Sybio/GifCreator)

# Synchronize files from SpectrumComputing

Only files added as part of ZXDB updates are required, which can be downloaded from "https://spectrumcomputing.co.uk/zxdb/".

# Download latest ZXDB

Latest ZXDB are available on it's [github page](https://github.com/zxdb/ZXDB) together with detailed documentation. Notice the version number for ZXDB_mysql.sql - for example 1.0.83 (we will refer to this later as ZXDB version).

# Populate mariaDB

Copy the files `ZXDB_mysql.sql` and `ZXDB_help_search.sql` from ZXDB. Rename ZXDB_mysql.sql to include the version, e.g. `ZXDB_mysql_1.0.83.sql`

Run `createZXDBcontainer.sh <zxdb_version>` to create containers with mariaDB populated with data for a particular version and a container for phpmyadmin to access the database.

```
./createZXDBcontainer.sh 1.0.83
```

The created mariaDB will by default use the password _zxdb1234_, but it's advised to change that to something more secure efter wards :-)

It might take a while before the mariaDB container is ready, but check with
myPhpAdmin, accessed in browser at [localhost](http://localhost:8080/) or from the Docker logs for when it has finished importing data.

# Create entries, mappings and import

Before creating documents cleanup is recommended:

## entries

```

# clean-up

find data/processed/ -type f -name "*.json" -exec rm -rf {} \;



# create JSON documents for entries

node --max-old-space-size=8192 create-entries-documents.js --all 2> zxscreens.txt

NOTE:

- Running the create-zxinfo-documents is known to fail, but all documents are created

- zxscreens.txt contains filenames for screenshots that needs to be converted (later step)

```

All created JSON documents can now be found in `data/entries/`

## mappings and import

A running instance of Elasticsearch must be running, for example the setup supplied with ZXInfo-App:

`docker-compose up -d`

and if upgrading a cleanup is recommended:

`curl -XDELETE 'http://localhost:9200/_all'`

To create ES mappings and import JSON files:

```

(cd ./Scripts/ && ./createEntries.sh)

```

# Convert entry screenshots

Screenshot references in the zxscreen.txt file (create when generation JSON documents) needs to be converted from .scr to .png/gif (.gif if flash is used).

First some cleanup:
`find data/screens/ -type f -name "*.json" -exec rm -rf {} \;`

To convert screenshots and import required addtional info:

```

(cd UpdateScreens && php convert.php) && node update-new-screens.js data/screens/

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

\***\*You should now have a complete up to date Elasticsearch with ZXDB\*\***

# Starting local test

```

zxinfo-neo4j (in zxapp-app)

docker-compose run --service-ports -d zxinfo-neo4j



zxinfo-app

NODE_ENV=development nodemon --ignore public/javascripts/config.js



zxinfo-service

NODE_ENV=development PORT=8300 nodemon --ignore public/javascripts/config.js

```

LAUNCH ZXInfo - http://localhost:3000/#!/home
