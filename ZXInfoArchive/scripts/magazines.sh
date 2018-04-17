#!/bin/bash
source settings.sh

#if [ "$#" -eq 0 ];then
#	echo "pls state the name of the file "
#        exit 1
#fi

# Delete all indexes
# curl -XDELETE "http://192.168.1.60:9200/zxinfo-*";

WRITE_INDEX=`date "+zxdb-magazines-%Y%m%d-%H%M%S"`
WRITE_ALIAS="${MAGAZINES_INDEX}_write"

echo 'Elasticsearch host: ' $ES_HOST
echo 'Elasticsearch port: ' $ES_PORT
echo 'Index/Type        : ' $MAGAZINES_INDEX/$MAGAZINES_TYPE
echo 'Index             : ' ${WRITE_INDEX}
echo 'Index_alias       : ' ${WRITE_ALIAS}

echo '-- create ' $WRITE_INDEX/$MAGAZINES_TYPE
curl -H'Content-Type: application/json' -XPUT "http://${ES_HOST}:${ES_PORT}/${WRITE_INDEX}/" -d @mappings/magazines-mapping.json; echo ""

echo '-- remove all alias for ' $WRITE_ALIAS
curl -H'Content-Type: application/json' -XPOST "http://${ES_HOST}:${ES_PORT}/_aliases" -d '
{
    "actions" : [
        { "remove" : { "index" : "*", "alias" : "'$WRITE_ALIAS'" } }
    ]
}'; echo ""

echo '-- create alias ' $WRITE_ALIAS ' for index ' $WRITE_INDEX
curl -H'Content-Type: application/json' -XPOST "http://${ES_HOST}:${ES_PORT}/_aliases" -d '
{
    "actions" : [
        { "add" : { "index" : "'$WRITE_INDEX'", "alias" : "'$WRITE_ALIAS'" } }
    ]
}'; echo ""

echo ""
echo 'Now import data into ['${WRITE_ALIAS}']'

(cd ../../ && (node import-magazines.js data/magazines/json/ 2> import-magazines.log)) &
PID=$!
wait $PID

if [ $? -eq 0 ]
then
  echo "Import OK"
else
  echo "Magazine import failed - pleae check log: import-magazines.log"
  exit 1
fi

read -n1 -r -p "Press any key to switch to new index" key

echo '-- remove all alias for ' ${MAGAZINES_INDEX}
curl -H'Content-Type: application/json' -XPOST "http://${ES_HOST}:${ES_PORT}/_aliases" -d '
{
    "actions" : [
        { "remove" : { "index" : "*", "alias" : "'${MAGAZINES_INDEX}'" } }
    ]
}'; echo ""

echo "Switching to new INDEX ${WRITE_INDEX} for ALIAS ${MAGAZINES_INDEX}"
curl -H'Content-Type: application/json' -XPOST "http://${ES_HOST}:${ES_PORT}/_aliases" -d '
{
    "actions" : [
        { "add" : { "index" : "'$WRITE_INDEX'", "alias" : "'$MAGAZINES_INDEX'" } }
    ]
}'