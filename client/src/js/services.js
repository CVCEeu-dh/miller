/**
 * @ngdoc service
 * @name miller.services
 * @description
 * # core
 * Resource REST API service Factory.
 */
angular.module('miller')
  .service('parseHeaderFilename', function() {  
    return function(headers) {
      var header = headers('content-disposition');
      var result = header.split(';')[1].trim().split('=')[1];
      return result.replace(/"/g, '');
    }
  })
  /*
    auth factory.
  */
  .factory('AuthFactory', function ($resource) {
    return $resource('/auth/:fn/', {},{
      login: {
        method: 'POST',
        params:{
          fn: 'login'
        }
      },
      register: {
        method: 'POST',
        fn: 'register'
      }
    });
  })

  /*
    Get a list of stories
  */
  .factory('StoryFactory', function ($resource, parseHeaderFilename) {
    return $resource('/api/story/:id/:fn', {},{
      update: {
        method:'PUT'
      },
      patch: {
        method:'PATCH'
      },
      download: {
        params:{fn:'download'},
        method: 'GET',
        responseType: 'arraybuffer',
        transformResponse: function(data, headers) {
          return {
            data: data,
            filename: parseHeaderFilename(headers)
          }
        }
      }
    });
  })
  .factory('StoryTagsFactory', function ($resource) {
    return $resource('/api/story/:id/tags/', {},{
      update: {
        method:'PUT'
      }
    });
  })
  .factory('StoryDocumentsFactory', function ($resource) {
    return $resource('/api/story/:id/documents/', {},{
      update: {
        method:'PUT'
      }
    });
  })
  .factory('ProfileFactory', function ($resource) {
    return $resource('/api/profile/:username/', {},{
      update: {
        method:'PUT'
      },
      patch: {
        method:'PATCH'
      }
    });
  })

  .factory('CollectionFactory', function ($resource) {
    return $resource('/api/collection/:id/', {}, {});
  })
  /*
    get a list of ralreeady saved document accessible by the user
  */
  // http://localhost:8888/api/document/
  .factory('DocumentFactory', function ($resource) {
    return $resource('/api/document/:id/', {},{
      update: {
        method:'PUT'
      }
    });
  })
  .factory('MentionFactory', function ($resource) {
    return $resource('/api/mention/:id/');
  })
  .factory('CaptionFactory', function ($resource) {
    return $resource('/api/caption/:id/', {},{
      update: {
        method:'PUT'
      },
      patch: {
        method:'PATCH'
      }
    });
  })
  /*
    list tags
  */
  .factory('TagFactory', function ($resource) {
    return $resource('/api/tag/:id/', {},{
      update: {
        method:'PUT'
      }
    });
  })
  /*
    get static pages
  */
  .factory('PageFactory', function ($http, RUNTIME) {
    return {
      get: function(params) {
        return $http.get(RUNTIME.static + 'pages/' + params.name + '.md');
      }
    };
  })

  /*
    Given a querystring return a proper js object
  */
  .service('QueryParamsService', function($filter){
    return function(queryparams){
      var params={};
      queryparams.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(str,key,value) {
        params[key] = decodeURIComponent(value);
      });
      return params;
    };
  })
  .service('bibtexService', function($filter) {
    return function(json){

    };
  })
  /*
    Given value in markdown, if it found something like <!-- lang:en_EN -->
    split the content according to the language section.
  */
  .service('markdownItLanguageService', function($filter){
    return function(value, language){
      var v,
        candidate;

      candidate = _(value.split(/<!--\s*(lang:[a-zA-Z_]{2,5})\s*-->/))
        .compact()
        .chunk(2)
        .fromPairs()
        .value();
      // console.log(language, candidate)
      if(candidate['lang:'+language])
        return candidate['lang:'+language];
      
      return value
    }
  })
  .service('markdownItChaptersService', function($filter,markdownItLanguageService) {
    return function(value, language){
      var links = [],
          linkIndex = 0,
          md = new window.markdownit();

      md.renderer.rules.link_open = function(tokens, idx){
        var url = tokens[idx].attrGet('href').trim(); // only on block element (e.g.  url starting with 'doc/' without any text attached.
        
        // console.log('LINK_OPEN', url, tokens[idx])
        if(url.indexOf('voc/') === 0){
          linkIndex++;
          links.push({
            _index: linkIndex, // internal id
            citation: tokens[idx + 1].content,
            slug: url.replace('voc/','').split(',')[0],
            type: 'chapter'
          });
        }
      };
      md.render(markdownItLanguageService(value, language));
      return links
    }
  })
  .service('markdownItService', function($filter) {
    return function(value, language){
      var results,
          sections, // document sections.
          md = new window.markdownit(),
          linkIndex = 0;

      // set initial value for results
      results = {
        md: value,
        html:'',
        ToC: [],
        docs: [],
        paragraphs: 0,
        footnotes: {}
      };
      // load footnotes plugin
      md
        .use(window.markdownitFootnote)
        .use(window.markdownitContainer, 'profile')

        .use(window.markdownitContainer, 'profile-committee')
        .use(window.markdownitContainer, 'profile-others')
        .use(window.markdownitContainer, 'abstract')
        .use(window.markdownItAttrs);

      
      // md.renderer.rules.paragraph_open = function(tokens, idx) {
      //   // console.log('paragraph', results.paragraphs, tokens[idx-1])
      //   if(idx > 0 && tokens[idx-1] && tokens[idx-1].type != 'footnote_open'){
      //     // debugger
      //     results.paragraphs++;
      //     // return '<p><div class="paragraph-number">'+results.paragraphs+'</div>'
      //     return '<p><span class="paragraph-number">'+results.paragraphs+'</span>'
      //   } else {
      //     return '<p>'
      //   }
      // }

      // rewrite links
      md.renderer.rules.link_open = function(tokens, idx){
        var url = tokens[idx].attrGet('href').trim(),
            klass = tokens[idx].attrGet('class') || ''; // only on block element (e.g.  url starting with 'doc/' without any text attached.

        // console.log('LINK_OPEN', url, tokens[idx])
        if(url.indexOf('doc/') === 0){
          var doc = url.trim().replace('doc/','').replace(/\//g,'-').split(',')[0];
          // for(var i in documents){
            linkIndex++;
            results.docs.push({
              _index: linkIndex, // internal id
              _type: tokens[idx + 1].content.length? 'doc': 'block-doc',
              citation: tokens[idx + 1].content,
              slug: doc
            });
          // }
          if(!tokens[idx + 1].content.length){
            return '<span id="item-'+linkIndex+'" class="lazy-placeholder '+klass+'" type="doc" lazy-placeholder="'+ doc + '"></span>';
          }

          return '<a id="item-'+linkIndex+'" class="special-link" name="'+ doc +'" ng-click="focus(\''+ linkIndex +'\',\'' +url+'\', \'doc\')"><span hold slug="'+doc +'" type="doc"  class="anchor-wrapper"></span><span class="icon icon-eye"></span>';
          // return '<a name="' + documents[0] +'" ng-click="hash(\''+url+'\')"><span class="anchor-wrapper"></span>'+text+'</a>';
        } else if(url.trim().indexOf('voc/') === 0){
          var terms = url.trim().replace('voc/','').split(',');
          for(var ind in terms){
            linkIndex++;
            results.docs.push({
              _index: linkIndex, // internal id
              _type: 'voc',
              citation: tokens[idx + 1].content,
              slug: terms[ind],
              type: 'glossary'
            });
          }
          if(!tokens[idx + 1].content.length){
            return '<span type="voc" lazy-placeholder="'+ terms[0] + '">' + terms[0];
          }
          tokens[idx].attrSet('class', 'glossary');
          return '<a id="item-'+linkIndex+'" class="special-link glossary"  ng-click="focus(\'' +linkIndex+'\')"><span hold slug="'+ terms[0] +'" type="voc" class="anchor-wrapper"></span><span class="icon icon-arrow-right-circle"></span>';
          // return '<a id="item-'+linkIndex+'" class="special-link glossary"  ng-click="fullsize(\'' +url+'\', \'voc\')"><span hold slug="'+ terms[0] +'" type="voc" class="anchor-wrapper"></span><span class="icon icon-arrow-right-circle"></span>';
        } else {
          return '<a href="'+url+'" target="_blank">';
        }  
      };


      md.renderer.rules.link_close = function(tokens, idx){
        
        if(tokens[idx-1].attrGet('href')){ // emtpy content, previous tocken was just href
          return '</span>';
        }
        return '</a>';
      };

      
      md.renderer.rules.heading_open = function(tokens, idx){
        var text = tokens[idx+1].content,
            h = {
              text: text,
              level: tokens[idx].tag.replace(/[^\d]/g, ''),
              slug: $filter('slugify')(text)
            };

        results.ToC.push(h);
        
        return '<' + tokens[idx].tag + '>'+
          // '<div class="anchor-sign" ng-click="hash(\''+ h.slug +'\')"><span class="icon-link"></span></div>'+
          '<a name="' + h.slug +'" class="anchor" href="#' + h.slug +'"><span class="header-link"></span></a>';
      };
      
      console.log('rules', md.renderer.rules);

      

      md.renderer.rules.image = function(tokens, idx){
        var src   = tokens[idx].attrGet('src'),
            title = tokens[idx].attrGet('title'),
            alt   = tokens[idx].content;

        // console.log('IMAGE', src, 'title:', title, 'alt:', alt, tokens[idx]);
        
        if(alt.indexOf('profile/') === 0){
          return '<div class="profile-thumb" style="background-image:url('+src+')"></div>';
        }
        return '<img src="'+ src+ '" title="'+title+'" alt="'+alt+'"/>';
      //   renderer.image = function(src, title, alt){
      //   if((alt||'').indexOf('profile/') === 0){
      //     return '<div class="profile-thumb" style="background-image:url('+src+')"></div>';
      //   }
      //   return '<img src="'+ src+ '" title="'+title+'" alt="'+alt+'"/>';
      // };
      };

      md.renderer.rules.footnote_anchor = function(tokens, idx, options, env, slf){
        var caption = slf.rules.footnote_caption(tokens, idx, options, env, slf);
        // eliminate starting and ending
        

        return '<span class="footnote-anchor">'+caption.replace(/[\[\]]/g, '')+'</span>';
      };
      //   console.log('markdownItService footnote', md.renderer.rules, tokens[idx])
      //   return '<div >'
      // }
      // change rules
      md.renderer.rules.footnote_ref = function (tokens, idx, options, env, slf) {
        // console.log(' md.renderer.rules.footnote_ref')
        var id = slf.rules.footnote_anchor_name(tokens, idx, options, env, slf);
        var caption = slf.rules.footnote_caption(tokens, idx, options, env, slf);
        linkIndex++;
        results.docs.push({
          _index: linkIndex, // internal id
          _type: 'footnote',
          id: id,
          caption: caption
        });

        return '<span  ng-click="focus(\''+ linkIndex +'\')" id="item-' + linkIndex +'" class="footnote-ref"><span class="footnote"><a>'+caption+'</a></span></span>' //replaced! footnote="'+ id + '" class="footnote-ref" caption="'+caption+'"></span>';
      };

      
      // get the yaml metadata ;)
      value.replace(/[\n\s\r]*---[\n\r]((.|[\n\r])+)\.{3}[\n\s\r]*/m, function(d, m){
        // basic metadata chunks @todo
        results.meta = m;
        return ''
      })
      
      // if(yamlmetadata)
      //   metadata = metadata[0]


      // split sections (main content and footnotes)
      // sections = _(value.split(/\s*[-_]{3,}\s*\n/)).value();

      // // console.log('markdownItService', sections.length)
      // // get the last section (bibliographic footnotes will be there)
      // if(sections.length > 1){
      //   results.footnotes = sections.pop();
      //   // override value with the reduced content
      //   value = sections.join('');
      //   // console.log('markedService footnotes: ', value)
      // }

      // split value according to language if available (reduce pairs)
      if(language){
        var candidate = _(value.split(/<!--\s*(lang:[a-zA-Z_]{2,5})\s*-->/))
          .compact()
          .chunk(2)
          .fromPairs()
          .value();
        // console.log(language, candidate)
        if(candidate['lang:'+language]) {
          value = candidate['lang:'+language];
        }
        //value = value.split();
        value = $filter('quotes')(value, language);
      }

      // modify results
      results.html = md.render(value);

      return results;
    };
  })
  .factory('metadataFactory', function($log) {
    return {
      parse: function(story){
        $log.info('[service] metadata.parse');
      },
      create: function(story){

      }
    };
  });