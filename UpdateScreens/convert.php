<?php
/*
	File structure:
	===============
	zxdb
	    └── sinclair
	        └── entries
	            ├── 0000461
	            │   ├── BattleShips.gif
	            │   └── BattleShips.tap.zip
	            ├── 0000557
	            │   └── Blackjack_3.gif
	            ├── 0000690
	            │   └── Breakout.tzx.zip
				├── 0030028
	            │   ├── 0030028-1-game.scr
	            │   ├── 0030028-1-load.scr
	            │   ├── Speccies2.tap.zip
	            │   └── Speccies2.tzx.zip            

	Screen dump: .scr, .ifl (multicolor)
*/
include_once('src/ZxImage/Converter.php');
include_once('src/GifCreator/GifCreator.php');

$scr_array = array();

function convertScreens($id, $in_dir, $out_dir) {
	echo "Scanning $in_dir, output $out_dir\n";

	$scr_files = glob($in_dir . DIRECTORY_SEPARATOR . '*.{scr,ifl}', GLOB_BRACE);

	foreach ($scr_files as &$filename) {
		global $scr_array;
		$fullpath = $filename;
		$size = filesize($fullpath);

		$info = pathinfo($fullpath);
		$file_name =  basename($fullpath,'.'.$info['extension']);

		echo "processing file: $file_name\n";

		$scrType = 'standard';
		switch ($size) {
		case 6912:
				$scrType = 'standard';
		        break;
		case 6976:
				$scrType = 'ulaplus';
		        break;
		case 24617:
				$scrType = 'sam4';
		        break;
		case 11136:
				$scrType = 'bsc';
		        break;
		case 11904:
				$scrType = 'bmc4';
		        break;
	 	case 13824:
				$scrType = 'gigascreen';
		        break;
	 	case 6144:
				$scrType = 'monochrome';
		        break;
	 	case 18432:
				$scrType = 'tricolor';
		        break;
	 	case 9216:
				$scrType = 'multicolor';
		        break;
	 	case 7680:
				$scrType = 'multicolor4';
		        break;
	 	case 768:
				$scrType = 'attributes';
		        break;
	 	case 1628:
				$scrType = 'lowresgs';
		        break;
	 	case 12288:
				$scrType = 'timex81';
		        break;
	 	case 12289:
				$scrType = 'timexhr';
		        break;
	 	default:
				$scrType = 'unknown';
		        break;
	    }
		if (strpos($filename, 'load.') !== false) {
			$type = 'Loading screen';
			$format = 'Picture';
		} else if (strpos($filename, 'game.') !== false) {
			$type = 'In-game screen';
			$format = 'Picture';
		}

		$converter = new \ZxImage\Converter();
		$converter->setType($scrType);
		$converter->setPath($fullpath);

		if ($binary = $converter->getBinary()) {
		    //after conversion we can ask for a mime type of last operation and send it to browser
		    $imageType = $converter->getResultMime();
		    switch($imageType) {
		    	case 'image/png':
				    $outfile = $out_dir . $file_name . ".png";
				    $newfilename = $file_name . ".png";
		    		// echo "saving to $outfile\n";
		    		break;
		    	case 'image/gif':
				    $outfile = $out_dir . $file_name . ".gif";
				    $newfilename = $file_name . ".gif";
		    		// echo "saving to $outfile\n";
		    		break;
		    	default:
		    		echo "unkown format: $imageType\n";
		    		break;
		    }

		    echo "writing content to $out_dir \n";
			if (!is_dir($out_dir)) {
				// dir doesn't exist, make it
				mkdir($out_dir, 0777, true);
			}
			file_put_contents($outfile, $binary);
			$newfilesize = filesize($outfile);			
			echo "$outfile, size: $newfilesize($size, $scrType)\n";
			$object = (object) ['filename' => $newfilename, 'url' => '/' . $outfile, 'size' => $newfilesize, 'type' => $type, 'format' => $format];

			if(is_null($scr_array[$id])) {
				$scr_array[$id] = array();
			}
			array_push($scr_array[$id], $object);
		}
	}
}


function scanFolder($in_dir, $out_dir) {
	echo "Scanning $in_dir\n";
	$files = array_diff(scandir($in_dir), array('..', '.'));

	foreach ($files as &$filename) {
		if(is_dir($in_dir . DIRECTORY_SEPARATOR . $filename)) {
			convertScreens($filename, $in_dir . $filename, 'zxdb/sinclair/entries/' . $filename . DIRECTORY_SEPARATOR);
		} else {
		}
	}
}


scanFolder('mirror/spectrumcomputing.co.uk/zxdb/sinclair/entries/', 'zxdb/sinclair/entries/');

//convertScreens('mirror/spectrumcomputing.co.uk/new/sinclair/screens/in-game/scr/', 'new/sinclair/screens/in-game/scr/');
// convertScreens('mirror/spectrumcomputing.co.uk/zxdb/sinclair/entries/', 'zxdb/sinclair/entries/');
// convertScreens('img/', 'img/');
// print_r($scr_array);
foreach ($scr_array as $key => $items) {
	$json_file = str_pad($key, 7, '0', STR_PAD_LEFT) . ".json";
	$json_items = json_encode($items, JSON_UNESCAPED_SLASHES);
	$json_str = "{ \"screens\": $json_items }";

	file_put_contents("json/" . $json_file, $json_str);

}


