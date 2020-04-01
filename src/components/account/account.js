import Trans from '../account/trans'
import {PAYEE_TS} from "../account/details";

export default class Account {
    constructor(doc) {
        this.aid = doc._id
        this.aname = doc.name
        this.abal = doc.bal
        this.aopen = doc.open
        this.aonBudget = doc.onBudget
        this.aweight = doc.weight
        this.anotes = doc.notes
        this.atxns = []
    }


    get bal() {
        return this.abal;
    }

    get id() {
        return this.aid;
    }

    get balance() {
        return this.abal;
    }

    get name() {
        return this.aname;
    }

    set name(name) {
        this.aname = name;
    }

    get open() {
        return this.aopen;
    }

    set open(open) {
        this.aopen = open;
    }

    get onBudget() {
        return this.aonBudget;
    }

    set onBudget(on) {
        this.aonBudget = on;
    }

    get weight() {
        return this.aweight;
    }

    set weight(weight) {
        this.aweight = weight;
    }

    get notes() {
        return this.anotes;
    }

    set notes(notes) {
        this.anotes = notes;
    }

    get txns() {
        return this.atxns;
    }

    set txns(txns) {
        this.atxns = txns;
    }

    get clearedBalance() {
        return this.getClearBalance(true);
    }

    get unclearedBalance() {
        return this.getClearBalance(false);
    }

    getClearBalance(cleared) {
        let total = 0
        let i
        let txn
        for (i = 0; i < this.txns.length; i++) {
            txn = this.txns[i]
            if ((cleared && txn.clear) || (!cleared && !txn.clear))
                total += txn.amount
        }
        return total;
    }

    getTxnSumm() {
        let ids = []
        let i
        let tot = 0
        for (i = 0; i < this.txns.length; i++) {
            let txn = this.txns[i]
            tot += txn.amount
            ids.push(this.txns[i].id)
        }
        return [ids, tot];
    }

    // TODO: round to two dec places
    // TODO: get rid of bal in Account class as we calc it?
    // TODO: rhs will result in clearedBalance and unclearedBalance being called twice - fix it
    // TODO: rhs title does not wok great when screen resized
    get workingBalance() {
        return this.clearedBalance + this.unclearedBalance
    }

    getAccountTotal = acc => {
        let total = 0;
        for (const txn of this.txns) {
            total += txn.in;
            total -= txn.out;
        }
        return total;
    }

    // TODO: update db
    deleteTxns = ids => {
        this.txns = this.txns.filter((txn, i) => {
            return !ids.includes(txn.id)
        })

    }

    static handleTxnPagin(result, self) {
        if (result.docs.length > 0) {
            self.txnOptions.prevStartkey = self.txnOptions.startkey
            self.txnOptions.startkey = result.docs[result.docs.length - 1].id
            self.txnOptions.skip = 1;
        }
    }
    // https://pouchdb.com/2014/04/14/pagination-strategies-with-pouchdb.html
    // https://pouchdb.com/guides/async-code.html
    // how to use find: https://pouchdb.com/guides/mango-queries.html, https://www.redcometlabs.com/blog/2015/12/1/a-look-under-the-covers-of-pouchdb-find
    static loadTxns(budgetCont, acc, resetOptions) {
        const db = budgetCont.props.db
        // TODO: delete old indexes and dbs in chrome?


        budgetCont.setState({loading: true})
        // TODO: tidy this fn
        // TODO: when filtering or sorting ensure each of the paginations alos takes that into account
        // TODO: do filter - search for isRowValid() && updateTarget() to see how it currently works
        // TODO: on first load use same code as for default date order
        // TODO: suss, sorting, filtering & pagination
        // TODO: get select all flags and select all rows to work
        // TODO: get totals at top of txns to work
        // TODO: suss if I always call these or only when each is reqd - but then how do I do initial one to create them?
        db.createIndex({index: {fields: ["type", "acc", "out"]}, ddoc: 'outIndex'}).then(function(){
            return db.createIndex({index: {fields: ["type", "acc", "in"]}, ddoc: 'inIndex'})
        }).then(function(){
            return db.createIndex({index: {fields: ["type", "acc", "cleared"]}, ddoc: 'clearIndex'})
        }).then(function(){
            return db.createIndex({index: {fields: ["type", "acc", "cat"]}, ddoc: 'catIndex'})
        }).then(function(){
            return db.createIndex({index: {fields: ["type", "acc", "payee"]}, ddoc: 'payeeIndex'})
        }).then(function(){
            return db.createIndex({index: {fields: ["type", "acc", "date"]}, ddoc: 'dateIndex'})
        }).then(function(){
            return db.createIndex({index: {fields: ["type", "acc", "memo"]}, ddoc: 'memoIndex'})
        }).then(function(){
            let txns = []
            // const txnIndex = "txn_index2"; // TODO: make same as initial data load
            if (resetOptions)
                budgetCont.txnOptions = { ...budgetCont.txnOptionsDefault }
            budgetCont.txnOptions['selector']['acc'] = acc.id
            // budgetCont.txnOptions['use_index'] = txnIndex

            // TODO: tidy up all code in this fn
            budgetCont.txnOptions['use_index'] = 'dateIndex'
                // return db.find(budgetCont.txnOptions)
            // const tempOptions = {use_index: 'abc2', limit: 10, selector: {type: {$eq: "txn"}, acc: {$eq: "5"}, date: {$gte: null}}}
            // const dir = budgetCont.txnOptions.dir
            const dir = budgetCont.state.txnFind.txnOrder.dir
            // TODO: use txnOptions? - for pagin
            // TODO: reset after clear input or change acc
            const searchTarget = budgetCont.state.txnFind.search.value
            let searchType
            let sortRow = budgetCont.state.txnFind.txnOrder.rowId
            // TODO: get this to work and then add the others
            if (searchTarget != null)
            {
                searchType = parseInt(budgetCont.state.txnFind.search.type)
                if (searchType == PAYEE_TS)
                    // TODO: use constant
                    sortRow = 'payee'
            }
            let select = {type: {$eq: "txn"}, acc: {$eq: acc.id}}
            let sort = [{type: dir}, {acc: dir}]
            let index
            const limit = 10
            // TODO: when change dir then reset the budgetCont.state.txnOrder (use default and remember object cloning)
            switch (sortRow)
            {
                case 'date':
                    index = 'dateIndex'
                    select['date'] = {$gte: null}
                    sort.push({date: dir})
                    break
                case 'payee':
                    index = 'payeeIndex'
                    select['payee'] = {$gte: null}
                    if (searchTarget != null && searchType == PAYEE_TS)
                        select['payee'] = {$eq: searchTarget}
                    sort.push({payee: dir})
                    break
                case 'cat':
                    index = 'catIndex'
                    select['cat'] = {$gte: null}
                    sort.push({cat: dir})
                    break
                case 'memo':
                    index = 'memoIndex'
                    select['memo'] = {$gte: null}
                    sort.push({memo: dir})
                    break
                case 'out':
                    index = 'outIndex'
                    select['out'] = {$gte: null}
                    sort.push({out: dir})
                    break
                case 'in':
                    index = 'inIndex'
                    select['in'] = {$gte: null}
                    sort.push({in: dir})
                    break
                case 'clear':
                    index = 'clearIndex'
                    select['cleared'] = {$gte: null}
                    sort.push({cleared: dir})
                    break
            }
            const tempOptions = {use_index: index,
                limit: limit,
                selector: select,
                sort: sort
            }

            // const tempOptions = {use_index: 'memoIndex', limit: 10, selector: {type: {$eq:'txn'}, acc: {$eq: "5"}, memo: {$gte: null}}}
            db.find(tempOptions
        // ,"sort": ["type", "acc", "memo"]
        //         sort: [{date: 'desc'}, {type: 'desc'}, {acc: 'desc'}]
            ).then(function(results){

    //         db.explain(tempOptions)
    // .then(function (explained) {
    //
    //
                Account.handleTxnPagin(results, budgetCont)
                results.docs.forEach(
                    function (row) {
                        txns.push(new Trans(row))
                    }
                );
                acc.txns = txns
                // set new active account
                budgetCont.setState({activeAccount: acc, loading: false})

            }).catch(function (err) {
                console.log(err);
            });
            })
    }
}