# GET old WOS load screens from spectrumcomputing.co.uk
#!/bin/bash

wget --reject "index.html*" --mirror -p -np --convert-links http://spectrumcomputing.co.uk/pub/sinclair/screens/load/ -P mirror/