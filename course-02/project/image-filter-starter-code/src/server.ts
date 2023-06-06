import express from 'express';
import { Request, Response } from 'express';
import bodyParser from 'body-parser';
import fs from 'fs';
import mimetypes from 'mime-types';
import { Base64 } from 'js-base64';
import {filterImageFromURL, deleteLocalFiles, isValidUrl} from './util/util';

(async () => {

  // Init the Express application
  const app = express();

  // Set the network port
  const port = process.env.PORT || 8082;
  
  // Use the body parser middleware for post requests
  app.use(bodyParser.json());

  // filteredimage Endpoint
  // returns a filterimage
  app.get('/filteredimage/',  
  async ( req: Request , res :Response) => {

    //Get the image_url from the query parameter.
    let { image_url, encoded }: { image_url?: string, encoded?: string } = req.query;

    // validate the image_url from req query.
    if (!image_url) {
        return res.status(400).send({ message: 'image_url is required' });
    }

    //To handle inbuilt query params in aws s3 url i encode and decode to base64
    if(encoded) {
      image_url = Base64.decode(image_url);
    }
    
    //check if its a valid url aswell.
    if(!isValidUrl(image_url)) {
        return res.status(400).send({ message: 'image_url is not a valid url' });
    }

    //Get filter image.
    const filterImagePath = await filterImageFromURL(image_url).catch((err) => 
    { 
       console.log(err);
       return res.status(422).send({ message: 'unable to process image' });
    })
    //Extra validation    
    if(!(typeof filterImagePath === 'string')) {
      return res.status(422).send({ message: 'unable to process image' });
    }

    //Parse the image extension for the correct header.
    const fileNameSplited =  filterImagePath.split('.');
    const fileNamExtension =  fileNameSplited[fileNameSplited.length-1];
    
    //Set header and send the filecontent
    const mime = mimetypes.lookup(fileNamExtension);
    res.set('Content-Type', (!mime) ? 'application/octet-stream' : mime);
    fs.createReadStream(filterImagePath).pipe(res);
    //Delete file
    res.on("finish", () => deleteLocalFiles([filterImagePath]));
  } );
  
  // Root Endpoint
  // Displays a simple message to the user
  app.get( "/", async ( req , res ) => {
    res.send("try GET /filteredimage?image_url={{}}")
  } );
  
  // Start the Server
  app.listen( port, () => {
      console.log( `server running http://localhost:${ port }` );
      console.log( `press CTRL+C to stop server` );
  } );
})();