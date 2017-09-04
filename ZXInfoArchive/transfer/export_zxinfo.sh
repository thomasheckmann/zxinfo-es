#!/bin/bash

echo "########### EXPORTING ZXINFO ###############"

# clean-up

rm -f zxinfo_games.index.txt zxinfo_games.mappings.txt zxinfo_suggests.index.txt zxinfo_suggests.mappings.txt

elasticdump \
  --input=http://localhost:9200/zxinfo_games \
  --output=zxinfo_games.index.txt \
  --type=data

elasticdump \
  --input=http://localhost:9200/zxinfo_games \
  --output=zxinfo_games.mappings.txt \
  --type=mapping

elasticdump \
  --input=http://localhost:9200/zxinfo_suggests \
  --output=zxinfo_suggests.index.txt \
  --type=data

elasticdump \
  --input=http://localhost:9200/zxinfo_suggests \
  --output=zxinfo_suggests.mappings.txt \
  --type=mapping
