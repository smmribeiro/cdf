/*! ******************************************************************************
 *
 * Pentaho
 *
 * Copyright (C) 2024 by Hitachi Vantara, LLC : http://www.pentaho.com
 *
 * Use of this software is governed by the Business Source License included
 * in the LICENSE.TXT file.
 *
 * Change Date: 2029-07-20
 ******************************************************************************/


/**
 * A basic set (in the mathematical sense) data structure
 *
 * @constructor
 * @param {Array or SimileAjax.Set} [a] an initial collection
 */

SimileAjax.Set = function(a) {
    this._hash = {};
    this._count = 0;
    
    if (a instanceof Array) {
        for (var i = 0; i < a.length; i++) {
            this.add(a[i]);
        }
    } else if (a instanceof SimileAjax.Set) {
        this.addSet(a);
    }
}

/**
 * Adds the given object to this set, assuming there it does not already exist
 *
 * @param {Object} o the object to add
 * @return {Boolean} true if the object was added, false if not
 */
SimileAjax.Set.prototype.add = function(o) {
    if (!(o in this._hash)) {
        this._hash[o] = true;
        this._count++;
        return true;
    }
    return false;
}

/**
 * Adds each element in the given set to this set
 *
 * @param {SimileAjax.Set} set the set of elements to add
 */
SimileAjax.Set.prototype.addSet = function(set) {
    for (var o in set._hash) {
        this.add(o);
    }
}

/**
 * Removes the given element from this set
 *
 * @param {Object} o the object to remove
 * @return {Boolean} true if the object was successfully removed,
 *   false otherwise
 */
SimileAjax.Set.prototype.remove = function(o) {
    if (o in this._hash) {
        delete this._hash[o];
        this._count--;
        return true;
    }
    return false;
}

/**
 * Removes the elements in this set that correspond to the elements in the
 * given set
 *
 * @param {SimileAjax.Set} set the set of elements to remove
 */
SimileAjax.Set.prototype.removeSet = function(set) {
    for (var o in set._hash) {
        this.remove(o);
    }
}

/**
 * Removes all elements in this set that are not present in the given set, i.e.
 * modifies this set to the intersection of the two sets
 *
 * @param {SimileAjax.Set} set the set to intersect
 */
SimileAjax.Set.prototype.retainSet = function(set) {
    for (var o in this._hash) {
        if (!set.contains(o)) {
            delete this._hash[o];
            this._count--;
        }
    }
}

/**
 * Returns whether or not the given element exists in this set
 *
 * @param {SimileAjax.Set} o the object to test for
 * @return {Boolean} true if the object is present, false otherwise
 */
SimileAjax.Set.prototype.contains = function(o) {
    return (o in this._hash);
}

/**
 * Returns the number of elements in this set
 *
 * @return {Number} the number of elements in this set
 */
SimileAjax.Set.prototype.size = function() {
    return this._count;
}

/**
 * Returns the elements of this set as an array
 *
 * @return {Array} a new array containing the elements of this set
 */
SimileAjax.Set.prototype.toArray = function() {
    var a = [];
    for (var o in this._hash) {
        a.push(o);
    }
    return a;
}

/**
 * Iterates through the elements of this set, order unspecified, executing the
 * given function on each element until the function returns true
 *
 * @param {Function} f a function of form f(element)
 */
SimileAjax.Set.prototype.visit = function(f) {
    for (var o in this._hash) {
        if (f(o) == true) {
            break;
        }
    }
}

/**
 * A sorted array data structure
 *
 * @constructor
 */
SimileAjax.SortedArray = function(compare, initialArray) {
    this._a = (initialArray instanceof Array) ? initialArray : [];
    this._compare = compare;
};

SimileAjax.SortedArray.prototype.add = function(elmt) {
    var sa = this;
    var index = this.find(function(elmt2) {
        return sa._compare(elmt2, elmt);
    });
    
    if (index < this._a.length) {
        this._a.splice(index, 0, elmt);
    } else {
        this._a.push(elmt);
    }
};

SimileAjax.SortedArray.prototype.remove = function(elmt) {
    var sa = this;
    var index = this.find(function(elmt2) {
        return sa._compare(elmt2, elmt);
    });
    
    while (index < this._a.length && this._compare(this._a[index], elmt) == 0) {
        if (this._a[index] == elmt) {
            this._a.splice(index, 1);
            return true;
        } else {
            index++;
        }
    }
    return false;
};

SimileAjax.SortedArray.prototype.removeAll = function() {
    this._a = [];
};

SimileAjax.SortedArray.prototype.elementAt = function(index) {
    return this._a[index];
};

SimileAjax.SortedArray.prototype.length = function() {
    return this._a.length;
};

SimileAjax.SortedArray.prototype.find = function(compare) {
    var a = 0;
    var b = this._a.length;
    
    while (a < b) {
        var mid = Math.floor((a + b) / 2);
        var c = compare(this._a[mid]);
        if (mid == a) {
            return c < 0 ? a+1 : a;
        } else if (c < 0) {
            a = mid;
        } else {
            b = mid;
        }
    }
    return a;
};

SimileAjax.SortedArray.prototype.getFirst = function() {
    return (this._a.length > 0) ? this._a[0] : null;
};

SimileAjax.SortedArray.prototype.getLast = function() {
    return (this._a.length > 0) ? this._a[this._a.length - 1] : null;
};

/*==================================================
 *  Event Index
 *==================================================
 */

SimileAjax.EventIndex = function(unit) {
    var eventIndex = this;
    
    this._unit = (unit != null) ? unit : SimileAjax.NativeDateUnit;
    this._events = new SimileAjax.SortedArray(
        function(event1, event2) {
            return eventIndex._unit.compare(event1.getStart(), event2.getStart());
        }
    );
    this._idToEvent = {};
    this._indexed = true;
};

SimileAjax.EventIndex.prototype.getUnit = function() {
    return this._unit;
};

SimileAjax.EventIndex.prototype.getEvent = function(id) {
    return this._idToEvent[id];
};

SimileAjax.EventIndex.prototype.add = function(evt) {
    this._events.add(evt);
    this._idToEvent[evt.getID()] = evt;
    this._indexed = false;
};

SimileAjax.EventIndex.prototype.removeAll = function() {
    this._events.removeAll();
    this._idToEvent = {};
    this._indexed = false;
};

SimileAjax.EventIndex.prototype.getCount = function() {
    return this._events.length();
};

SimileAjax.EventIndex.prototype.getIterator = function(startDate, endDate) {
    if (!this._indexed) {
        this._index();
    }
    return new SimileAjax.EventIndex._Iterator(this._events, startDate, endDate, this._unit);
};

SimileAjax.EventIndex.prototype.getReverseIterator = function(startDate, endDate) {
    if (!this._indexed) {
        this._index();
    }
    return new SimileAjax.EventIndex._ReverseIterator(this._events, startDate, endDate, this._unit);
};

SimileAjax.EventIndex.prototype.getAllIterator = function() {
    return new SimileAjax.EventIndex._AllIterator(this._events);
};

SimileAjax.EventIndex.prototype.getEarliestDate = function() {
    var evt = this._events.getFirst();
    return (evt == null) ? null : evt.getStart();
};

SimileAjax.EventIndex.prototype.getLatestDate = function() {
    var evt = this._events.getLast();
    if (evt == null) {
        return null;
    }
    
    if (!this._indexed) {
        this._index();
    }
    
    var index = evt._earliestOverlapIndex;
    var date = this._events.elementAt(index).getEnd();
    for (var i = index + 1; i < this._events.length(); i++) {
        date = this._unit.later(date, this._events.elementAt(i).getEnd());
    }
    
    return date;
};

SimileAjax.EventIndex.prototype._index = function() {
    /*
     *  For each event, we want to find the earliest preceding
     *  event that overlaps with it, if any.
     */
    
    var l = this._events.length();
    for (var i = 0; i < l; i++) {
        var evt = this._events.elementAt(i);
        evt._earliestOverlapIndex = i;
    }
    
    var toIndex = 1;
    for (var i = 0; i < l; i++) {
        var evt = this._events.elementAt(i);
        var end = evt.getEnd();
        
        toIndex = Math.max(toIndex, i + 1);
        while (toIndex < l) {
            var evt2 = this._events.elementAt(toIndex);
            var start2 = evt2.getStart();
            
            if (this._unit.compare(start2, end) < 0) {
                evt2._earliestOverlapIndex = i;
                toIndex++;
            } else {
                break;
            }
        }
    }
    this._indexed = true;
};

SimileAjax.EventIndex._Iterator = function(events, startDate, endDate, unit) {
    this._events = events;
    this._startDate = startDate;
    this._endDate = endDate;
    this._unit = unit;
    
    this._currentIndex = events.find(function(evt) {
        return unit.compare(evt.getStart(), startDate);
    });
    if (this._currentIndex - 1 >= 0) {
        this._currentIndex = this._events.elementAt(this._currentIndex - 1)._earliestOverlapIndex;
    }
    this._currentIndex--;
    
    this._maxIndex = events.find(function(evt) {
        return unit.compare(evt.getStart(), endDate);
    });
    
    this._hasNext = false;
    this._next = null;
    this._findNext();
};

SimileAjax.EventIndex._Iterator.prototype = {
    hasNext: function() { return this._hasNext; },
    next: function() {
        if (this._hasNext) {
            var next = this._next;
            this._findNext();
            
            return next;
        } else {
            return null;
        }
    },
    _findNext: function() {
        var unit = this._unit;
        while ((++this._currentIndex) < this._maxIndex) {
            var evt = this._events.elementAt(this._currentIndex);
            if (unit.compare(evt.getStart(), this._endDate) < 0 &&
                unit.compare(evt.getEnd(), this._startDate) > 0) {
                
                this._next = evt;
                this._hasNext = true;
                return;
            }
        }
        this._next = null;
        this._hasNext = false;
    }
};

SimileAjax.EventIndex._ReverseIterator = function(events, startDate, endDate, unit) {
    this._events = events;
    this._startDate = startDate;
    this._endDate = endDate;
    this._unit = unit;
    
    this._minIndex = events.find(function(evt) {
        return unit.compare(evt.getStart(), startDate);
    });
    if (this._minIndex - 1 >= 0) {
        this._minIndex = this._events.elementAt(this._minIndex - 1)._earliestOverlapIndex;
    }
    
    this._maxIndex = events.find(function(evt) {
        return unit.compare(evt.getStart(), endDate);
    });
    
    this._currentIndex = this._maxIndex;
    this._hasNext = false;
    this._next = null;
    this._findNext();
};

SimileAjax.EventIndex._ReverseIterator.prototype = {
    hasNext: function() { return this._hasNext; },
    next: function() {
        if (this._hasNext) {
            var next = this._next;
            this._findNext();
            
            return next;
        } else {
            return null;
        }
    },
    _findNext: function() {
        var unit = this._unit;
        while ((--this._currentIndex) >= this._minIndex) {
            var evt = this._events.elementAt(this._currentIndex);
            if (unit.compare(evt.getStart(), this._endDate) < 0 &&
                unit.compare(evt.getEnd(), this._startDate) > 0) {
                
                this._next = evt;
                this._hasNext = true;
                return;
            }
        }
        this._next = null;
        this._hasNext = false;
    }
};

SimileAjax.EventIndex._AllIterator = function(events) {
    this._events = events;
    this._index = 0;
};

SimileAjax.EventIndex._AllIterator.prototype = {
    hasNext: function() {
        return this._index < this._events.length();
    },
    next: function() {
        return this._index < this._events.length() ?
            this._events.elementAt(this._index++) : null;
    }
};
