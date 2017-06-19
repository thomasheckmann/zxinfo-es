# GET 'new' screens from spectrumcomputing.co.uk
#!/bin/bash

wget --reject "index.html*" --mirror -p -np --convert-links http://spectrumcomputing.co.uk/zxdb/sinclair/ -P mirror/
