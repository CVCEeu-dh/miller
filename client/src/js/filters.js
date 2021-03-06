angular.module('miller')
  .filter('prefixTemplate', function (RUNTIME) {
    return function (input) {
      return RUNTIME.static + input;
    };
  })
  .filter('bibtex', function(){
    return function (text) {
      return text? text.replace(/[\{\}]/g,''): '';
    };
  })
  .filter('smartUrl', function(){
    return function(text){
      return (text || '')
        .replace(/^https?:\/\/(www)?\.?([^\/]*)\/(.*)$/, function(m,www,domain,path){
          return domain + '/...'+ path.substr(-25);
        })
    }
  })
  /*
    Replace quotes
  */
  .filter('quotes', function(){
    return function(text, language){
      var st = {
        lq: {
          en_US: {
            '«':'“',
            '"':'“'
          },
          fr_FR: {
            '“':'«',
            '"':'«'
          }
        },
        rq: {
          en_US: {
            '»':'”',
            '"':'”'
          },
          fr_FR: {
            '”':'»',
            '"':'»'
          }
        }
      };

      return (text || '')
        .replace(/([\s,;\?\.\!\[\]\(\)])(["«“])([^"»”]*)(["»”])([\s,;\?\.\!\[\]\(\)])/g, function(m, left, lq, quote, rq, right){
          return [left, (st.lq[language][lq] || lq), quote, (st.rq[language][rq] || rq), right].join('')
        });
    }
  })
  /*
    Translit non ascii chars and uniform punctuations signs
  */
  .filter('slugify', function(){
    return function (text) {
      var strip  = /[^\w\s-]/g,
          hyphen = /[-\s]+/g,
          slug   = text.toLowerCase();

      var map = {
        from: 'àáäãâèéëêìíïîòóöôõùúüûñç·/_,:;', 
        to  : 'aaaaaeeeeiiiiooooouuuunc------'
      };
 
      for (var i=0, j=map.from.length; i<j; i++) {
        slug = slug.replace(new RegExp(map.from.charAt(i), 'g'), map.to.charAt(i));
      }
      return slug.replace(strip, '').trim().replace(hyphen, '-');
    };
  });