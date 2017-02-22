#!/bin/bash
source settings.sh

echo 'Elasticsearch host: ' $ES_HOST
echo 'Elasticsearch port: ' $ES_PORT
echo 'Index: ' $SUGGESTS_INDEX/$SUGGESTS_TYPE

echo '-- delete ' $SUGGESTS_INDEX/$SUGGESTS_TYPE
curl -XDELETE "http://${ES_HOST}:${ES_PORT}/${SUGGESTS_INDEX}"; echo ""

echo '-- create ' $SUGGESTS_INDEX/$SUGGESTS_TYPE
curl -XPUT "http://${ES_HOST}:${ES_PORT}/${SUGGESTS_INDEX}/" -d @mappings/suggests-mapping.json; echo ""

echo '-- get mappings for ' $SUGGESTS_INDEX/$SUGGESTS_TYPE
curl -XGET "http://${ES_HOST}:${ES_PORT}/${SUGGESTS_INDEX}/_mapping/${SUGGEST_TYPE}"; echo ""
