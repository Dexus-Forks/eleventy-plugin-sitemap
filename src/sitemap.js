"use strict";

const { SitemapAndIndexStream, SitemapStream, streamToPromise } = require("sitemap");

const sitemapItems = require("./sitemapItems");

/**
 * Builds an XML sitemap.
 *
 * @async
 * @param {Array} items Array with items built using function `sitemapItem`.
 * @param {object|undefined} options Optional plugin user options.
 * @returns {Promise<string>} XML sitemap.
 */
module.exports = async function sitemap(items, options) {
  const outputDestination = options && options.output_destination;
  const streamOptions = options && options.sitemap;
  const stream = new SitemapStream(streamOptions);
  const links = sitemapItems(items, options);
  const sms = new SitemapAndIndexStream({
    limit: 50000, // defaults to 45k
    lastmodDateOnly: false, // print date not time
    // SitemapAndIndexStream will call this user provided function every time
    // it needs to create a new sitemap file. You merely need to return a stream
    // for it to write the sitemap urls to and the expected url where that sitemap will be hosted
    getSitemapStream: (i) => {
      const sitemapStream = new SitemapStream(streamOptions);
      // if your server automatically serves sitemap.xml.gz when requesting sitemap.xml leave this line be
      // otherwise you will need to add .gz here and remove it a couple lines below so that both the index 
      // and the actual file have a .gz extension
      const path = `${outputDestination}/sitemap-${i}.xml`; 
  
      const ws = sitemapStream
        .pipe(createWriteStream(resolve(path)))
        .pipe(createGzip()) // compress the output of the sitemap
        .pipe(createWriteStream(resolve(path + '.gz'))); // write it to sitemap-NUMBER.xml
  
      return [new URL(path, `${streamOptions.hostname}/`).toString(), sitemapStream, ws];
    },
  });

  sms
    .pipe(createWriteStream(resolve('./sitemap-index.xml')))
    .pipe(createGzip())
    .pipe(createWriteStream(resolve('./sitemap-index.xml.gz')));

  for (const link of links) {
    sms.write(link);
  }

  sms.end()

};
