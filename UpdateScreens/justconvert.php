<?php

include_once('src/ZxImage/Converter.php');
include_once('src/GifCreator/GifCreator.php');

$scr_array = array();

function convertScreens($in_dir, $out_dir) {
	$scr_files = array_diff(scandir($in_dir), array('..', '.'));

	foreach ($scr_files as &$filename) {
		global $scr_array;
		$fullpath = $in_dir . $filename;
		$size = filesize($fullpath);

		$info = pathinfo($fullpath);
		$file_name =  basename($fullpath,'.'.$info['extension']);

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
		} else if (strpos($filename, 'game.') !== false) {
			$type = 'In-game screen';
		}

		$arr = explode("-", $filename, 2);
		$id = $arr[0];

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
			file_put_contents($outfile, $binary);
			$newfilesize = filesize($outfile);			
			echo "($id) - ($type) $filename - $scrType, size: $size => $outfile, size: $newfilesize\n";
			$object = (object) ['filename' => $newfilename, 'url' => '/' . $outfile, 'size' => $newfilesize, 'type' => $type];

			if(is_null($scr_array[$id])) {
				$scr_array[$id] = array();
			}
			array_push($scr_array[$id], $object);
		}
	}
}

convertScreens('t/', 't/');


