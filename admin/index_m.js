// Verbrauchszähler - Copyright (c) by proper0912
// Please visit https://github.com/proper0912/ioBroker.verbrauchszaehler for licence-agreement and further information

//Settings

// This will be called by the admin adapter when the settings page loads

function startCounter(i) {
    var $counter = $('#counter');
    if (i === undefined) {
        count = 4;
    } else if (i === 0) {
        $counter.hide();
    } else {
        $counter.html(i.toString()).show();
        setTimeout(function () {
            startCounter(i - 1);
        }, 1000);
    }
}

function stopCounter() {
    $('#counter').hide();
}

function load(settings, onChange) {
        if (!settings)
            return;
        $('.value').each(function () {
            var $key = $(this);
            var id = $key.attr('id');
            if ($key.attr('type') === 'checkbox') {
                // do not call onChange direct, because onChange could expect some arguments
                $key.prop('checked', settings[id]).on('change', function () {
                    onChange();
                });
            } else {
                // do not call onChange direct, because onChange could expect some arguments
                $key.val(settings[id]).on('change', function () {
                    onChange();
                }).on('keyup', function () {
                    onChange();
                });
            }
        });
        onChange(false);
        M.updateTextFields();  // function Materialize.updateTextFields(); to reinitialize all the Materialize labels on the page if you are dynamically adding inputs.

        M.Range.init($('input[type=range]'));
    }

// ... and the function save has to exist.
// you have to make sure the callback is called with the settings object as first param!
function save(callback) {
        // example: select elements with class=value and build settings object
        var obj = {};
        $('.value').each(function () {
            var $this = $(this);
            if ($this.attr('type') === 'checkbox') {
                obj[$this.attr('id')] = $this.prop('checked');
            } else {
                obj[$this.attr('id')] = $this.val();
            }
        });
        callback(obj);
    }

// Signal to admin, that no changes yet
onChange(false);