/*
knockout-selectize.js (v0.1)

Copyright (c) Ninjacode Limited - http://ninjacode.co.uk
License: MIT (http://www.opensource.org/licenses/mit-license.php)

@auther Anish Patel
 */

(function (ko, $, undefined) {

    var selectizeAdapter = function(element, dataBinding) {
        var $selectize, hashTable, mode;
        var selectedObj = dataBinding.selectedObject;
        var selectedObjs = dataBinding.selectedObjects;
        var newObjs = dataBinding.newObjects;
        var identifier = dataBinding.valueField;
        var fnCreate = dataBinding.create;

        var createWrapper = function(input, create) {
            var output = fnCreate(input, create);
            if (output) {
                hashTable[output[identifier]] = output;
                newObjs && newObjs.push(output);
                return output;
            }
        };

        var render = function(template, data) {
            var temp = $('<div>');
            ko.applyBindingsToNode(temp[0], { template: { name: template, data: data } });
            var html = temp.html();
            temp.remove();
            return html.trim();
        }

        var setupRenderingOptions = function(obj) {
            for (var p in obj) {
                if (typeof obj[p] === "string") {
                    obj[p] = (function(templateName) {
                        return function() {
                            return render(templateName, arguments[0]);
                        };
                    })(obj[p]);
                }

                if (typeof obj[p] === "function") {
                    obj[p] = (function(fn) {
                        return function() {
                            return '<div>' + fn(arguments[0]) + '</div>';
                        };
                    })(obj[p]);
                }
            }
        }

        var adapter = {
            single: {
                subsciption: null,
                selectHandler: function(key) {
                    this.subsciption.dispose();
                    this.updateBindingContext(key);
                    this.subscribe();
                },
                updateBindingContext: function(key) {
                    selectedObj(hashTable[key] || null);
                },
                update$selectize: function() {
                    var obj = selectedObj();
                    $selectize.setValue(!!obj && ko.unwrap(obj[identifier]) || null);
                },
                subscribe: function() {
                    this.subsciption = selectedObj.subscribe(this.update$selectize);
                }
            },
            multi: {
                subsciption: null,
                selectHandler: function(keys) {
                    this.subsciption.dispose();
                    this.updateBindingContext(keys);
                    this.subscribe();
                },
                updateBindingContext: function(keys) {
                    var arr = [];
                    for (var i in keys) {
                        var key = keys[i];
                        var item = hashTable[key];
                        if (!item) continue;
                        arr.push(item);
                    }
                    selectedObjs(arr);
                },
                update$selectize: function() {
                    var selectedItems = selectedObjs().map(function(item) {
                        return item[identifier];
                    });
                    $selectize.setValue(selectedItems);
                },
                subscribe: function() {
                    this.subsciption = selectedObjs.subscribe(this.update$selectize, null, "arrayChange");
                }
            }
        };

        this.initialize = function() {
            var options = dataBinding;
            var refreshTrigger = (!!dataBinding.refreshTrigger && ko.isSubscribable(dataBinding.refreshTrigger)) && dataBinding.refreshTrigger;
            delete options.refreshTrigger;
            options.options = ko.unwrap(options.options);
            if (typeof fnCreate == "function") options.create = createWrapper;
            if (options.render) setupRenderingOptions(options.render);
            $selectize = $(element).selectize(options)[0].selectize;
            hashTable = $selectize.options;
            mode = $selectize.settings.mode;
            adapter[mode].subscribe.call(adapter[mode]);
            adapter[mode].update$selectize();
            $selectize.on("change", adapter[mode].selectHandler.bind(adapter[mode]));
            if (!!refreshTrigger) {
                this.refreshTriggerSubscription = refreshTrigger.subscribe(this.triggerRefresh);
            }
        }.bind(this);

        this.dispose = function() {
            $selectize.destroy();
            adapter[mode].subsciption.dispose();
            this.refreshTriggerSubscription.dispose();
        }

        this.refreshTriggerSubscription = { dispose: function() {} };
        this.triggerRefresh = function(refresh) {
            refresh && delete $selectize.loadedSearches[''];
            refresh && $selectize.onSearchChange('');
        }
    }

    ///<summary>
    /// <select data-bind="selectize:{ options: observableArray, selectedObjects: observableArray, selectedObject: observable, newObjects: observableArray }"></select>
    ///</summary>
    ko.bindingHandlers.selectize = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            // create adapter
            var adapter = new selectizeAdapter(element, valueAccessor());

            // register disposal
            ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
                adapter.dispose();
            });

            // initialize adapter
            adapter.initialize();
        }
    }

})(ko, $)
