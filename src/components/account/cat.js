import {v4 as uuidv4} from "uuid";
import {KEY_DIVIDER, SHORT_BUDGET_PREFIX, CAT_PREFIX, CAT_ITEM_PREFIX, MONTH_CAT_ITEM_PREFIX} from './keys'
import {getDateIso, getMonthDigit} from "../../utils/date";

// if I use getters and setters then I need to prefix with t otherwise get errors, so avoided here
// using classes as I need to add specific functionality
export default class CatGroup {
    constructor(doc) {
        this.setId(doc._id)
        this.rev = doc._rev
        this.name = doc.name
        this.weight = doc.weight
        this.collapsed = doc.collapsed
        this.items = []
    }

    get shortId() {
        return this.ashortId;
    }

    setId = (id) => {
        this.id = id
        const lastDividerPosn = id.lastIndexOf(KEY_DIVIDER)
        this.ashortId = id.substring(lastDividerPosn + 1)
    }

    // https://github.com/uuidjs/uuid
    static getNewId(shortBudId) {
        return SHORT_BUDGET_PREFIX + shortBudId + KEY_DIVIDER + CAT_PREFIX + uuidv4()
    }

    asJson(incRev) {
        let json = {
            "_id": this.id,
            "type": "cat",
            "name": this.name,
            "weight": this.weight,
            "collapsed": this.collapsed
        }
        if (incRev)
            json["_rev"] = this.rev
        return json
    }

    getCatItem(id)
    {
        let theItem = null
        for (const item of this.items)
        {
            if (item.shortId === id)
            {
                theItem = item
                break
            }
        }
        return theItem
    }
}

export class CatItem {
    constructor(doc) {
        this.setId(doc._id)
        this.rev = doc._rev
        this.name = doc.name
        this.weight = doc.weight
        this.cat = doc.cat
        // array keyed by year and month 'YYYY-MM'
        // only four loaded initially - previous month, this month, next month and following month
        this.monthItems = []
    }

    setId = (id) => {
        this.id = id
        const lastDividerPosn = id.lastIndexOf(KEY_DIVIDER)
        this.ashortId = id.substring(lastDividerPosn + 1)
    }

    asJson(incRev) {
        let json = {
            "_id": this.id,
            "type": "catItem",
            "name": this.name,
            "weight": this.weight,
            "cat": this.cat
        }
        if (incRev)
            json["_rev"] = this.rev
        return json
    }

    get shortId() {
        return this.ashortId;
    }

    get budgeted() {
        return 10
    }

    get balance() {
        return this.budgeted - 0
    }

    // https://github.com/uuidjs/uuid
    static getNewId(shortBudId) {
        return SHORT_BUDGET_PREFIX + shortBudId + KEY_DIVIDER + CAT_ITEM_PREFIX + uuidv4()
    }

    // TODO: tie in moving of date in top half to moving bottom half
    getMonthItem(date) {
        const item = this.monthItems[getDateIso(date)]
        return typeof item === "undefined" ? 0.00 : item;
    }
}

export class MonthCatItem {
    constructor(doc) {
        const lastDividerPosn = doc._id.lastIndexOf(KEY_DIVIDER)
        const date = doc._id.substring(lastDividerPosn - 10, lastDividerPosn)
        this.id = doc._id
        this.rev = doc._rev
        this.catItem = doc.catItem
        this.date = new Date(date)
        this.abudget = doc.budget
        this.overspending = doc.overspending
        this.notes = doc.notes
    }

    asJson(incRev) {
        let json = {
            "_id": this.id,
            "type": "monthCatItem",
            "catItem": this.catItem,
            "date": getDateIso(this.date),
            "budget": this.budget,
            "overspending": this.overspending,
            "notes": this.notes
        }
        if (incRev)
            json["_rev"] = this.rev
        return json
    }

    set budget(budget) {
        this.abudget = budget
    }

    get budget() {
        return this.abudget
    }

    get outflows() {
    // TODO: calc this
        return 50
    }

    get balance() {
    // TODO: calc this
        return 150
    }

    get datePart() {
        const bits = this.id.split(KEY_DIVIDER)
        return bits[3]
    }

    // https://github.com/uuidjs/uuid
    // eg: "b:1:monCat:2020-06-01:1"
    static getNewId(shortBudId, date) {
        const monthDigit = getMonthDigit(date)
        const year = date.getFullYear()
        const dateStr = year + '-' + monthDigit + '-01'
        return SHORT_BUDGET_PREFIX + shortBudId + KEY_DIVIDER + MONTH_CAT_ITEM_PREFIX + dateStr + KEY_DIVIDER + uuidv4()
    }
}
