(function () {
    "use strict";

    (window.application || (window.application = {})).global = new function () {

        /* ustaw atrybuty dla elementu :root */
        function initRootAttrbute() {

            var rootAttributes = {
                "data-config-url-query": location.search.replace('?', ''),
                "data-config-url-fragment": location.hash.replace('#', ''),
                "data-config-url-port": location.port || '80',
                "data-config-url-host": location.hostname || 'localhost',
                "data-config-url-path": location.pathname,
                "data-config-url-page": location.pathname.split('/').pop(),
                "data-config-url-protocol": location.protocol.replace(':', '') || 'http',
                "data-config-browser-user-agent": navigator.userAgent || 'none',
                "data-config-browser-platform": navigator.platform || 'none',
                "data-config-browser-ie-version": document.documentMode || 'none',
                "data-config-browser-modern": !!document.querySelector && !!window.localStorage && !!window.addEventListener ? 'yes' : 'no'
            };

            var r = document.documentElement;
            var k = null;

            for (k in rootAttributes) {
                r.setAttribute(k, rootAttributes[k]);
            }
        }

        /* t - template, d - data, h - helpers */
        function render(t, d) {
            t.match(/([^{]+)(?=})/g).reduce(function (p, c) {
                !~p.indexOf(c) && p.push(c);
                return p;
            }, []).forEach(function (k) {
                t = t.replace(new RegExp('{' + k + '}', 'g'), k.split('.').reduce(function (d, c) {

                    return d[c];
                }, d));
            });
            return t;
        }

        /// Ajax and CORS request
        /// {
        ///    url, method, data, callback, errback, contentType
        /// }
        function ajax(settings) {
            var req;

            if (!settings) return;

            if (settings.params || (settings.method && settings.method.toUpperCase() === 'GET' && settings.data)) {
                settings.url = settings.url + '?' + getRequestParamsString(settings.params || settings.data);
            }
            if (settings.method && settings.method.toUpperCase() === 'POST' && !(settings.data instanceof String)) {
                settings.data = JSON.stringify(settings.data);
            }

            if (XMLHttpRequest) {
                req = new XMLHttpRequest();
                if ('withCredentials' in req) {
                    req.open(settings.method, settings.url, true);
                    req.onerror = settings.errback;
                    req.onreadystatechange = function () {
                        if (req.readyState === 4) {
                            if (req.status >= 200 && req.status < 400) {
                                if (settings.callback) {
                                    settings.callback(req.responseText);
                                }
                            } else {
                                if (settings.errback) {
                                    settings.errback(new Error('Response returned with non-OK status'));
                                }
                            }
                        }
                    };
                    if (settings.contentType) {
                        req.setRequestHeader('Content-Type', settings.contentType);
                    }
                    req.send(settings.data);
                }
            } else {
                if (settings.errback) {
                    settings.errback(new Error('CORS not supported'));
                }
            }
        }

        /* podpięcie zdarzeń */
        function bindPageEvents() {

            window.addEventListener("submit", function (e) {
                e.preventDefault();

                var URL_REPLACEMENT = "http://176.119.58.29/api/v1/replacement/{0}/{1}/{2}/{3}/{4}";

                var twojaRecepta = "<legend>Twoja Recepta:</legend><fieldset>";
                twojaRecepta += document.getElementById("lek1").value + "<fieldset>";
                twojaRecepta += document.getElementById("lek2").value + "<fieldset>";
                twojaRecepta += document.getElementById("lek3").value + "<fieldset>";
                twojaRecepta += document.getElementById("lek4").value + "<fieldset>";
                twojaRecepta += document.getElementById("lek5").value + "<fieldset>";

                document.getElementById('twoja-recepta').innerText = '';
                document.getElementById('twoja-recepta').insertAdjacentHTML("beforeend", twojaRecepta);




                //var buff = "";
                var isPlus75 = document.getElementById("plus75").checked ? 1 : 0;

                var drugs = [];

                for (var x = 1; x < 6; ++x) {
                    var elem = "lek" + x;
                    if (document.getElementById(elem).value.split(";")[0] != "") {
                        drugs.push(document.getElementById(elem).value.split(";"));
                    }
                }

                var el = document.getElementById('resources');
                el.innerHTML = "<legend>Propozycja Recepty:</legend>";

                drugs.forEach(function (d) {
                    if (d.length > 0) {

                        ajax({
                            url: URL_REPLACEMENT.replace("{0}", d[0].trim())
                                .replace("{1}", d[2].trim())
                                .replace("{2}", d[3].trim())
                                .replace("{3}", d[4].trim().replace("refundacja:", "").replace(" ", ""))
                                .replace("{4}", isPlus75)
                                .replace("%", "%25")
                            , method: "GET",
                            callback: function (result) {

                                var buff = "";
                                if (result != "(null)") {
                                    var r = JSON.parse(result);

                                    if (r) {
                                        r.result.forEach(function (e) {
                                            buff += '<fieldset>{0}; {1}; {2}; Cena [PLN]: {3}</fieldset>'.replace("{0}", e.drug_name).replace("{1}", e.drug_type).replace("{2}", e.drug_pack).replace("{3}", e.customer_price);
                                        });

                                        if (el) {
                                            el.insertAdjacentHTML("beforeend", buff);
                                        }
                                    }
                                } else {
                      
                                    buff += '<fieldset>{0}; {1}; {2}; Cena [PLN]: {3}</fieldset>'.replace("{0}", d[0]).replace("{1}", d[2]).replace("{2}", d[3]).replace("{3}", d[4]);

                                    if (el) {
                                        el.insertAdjacentHTML("beforeend", buff);
                                    }
                                }


                            }
                        });


                    }
                });

            }, true);


            window.addEventListener("input", function (e) {

                //jezeli wiecej niz trzy znaki i input[type=text]
                if (e.target.type == 'text' && e.target.value.length > 2) {
                    var URL_SEARCH = "http://176.119.58.29/api/v1/search/{1}";

                    ajax({
                        url: URL_SEARCH.replace("{1}", e.target.value), method: "GET",
                        callback: function (result) {

                            var searchList = document.getElementById("search-list");
                            if (searchList) {

                                var r = JSON.parse(result);
                                var buff;

                                if (r) {
                                    r.result.forEach(function (e) {
                                        buff += '<option value="{0}; refundacja: {1}; cena [PLN]: {2}"></option>'.replace("{0}", e.nazwa).replace("{1}", e.refund).replace("{2}", e.customer_price);
                                    });

                                    searchList.innerHTML = buff;
                                }
                            }

                        }
                    });
                }

            }, true);
        }


        return {

            //static - initial function
            init: new function () {

                document.addEventListener('DOMContentLoaded', function (e) {

                    initRootAttrbute();
                    bindPageEvents();

                }, true);
            }
        }
    }

} ());