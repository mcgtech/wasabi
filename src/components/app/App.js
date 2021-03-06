import React, {Component} from 'react'
import AccountsContainer, {Budget, BudgetList} from '../account/budget'
import Trans from "../account/trans"
import {processSchedule} from "../../utils/schedule"
// https://www.manifold.co/blog/building-an-offline-first-app-with-react-and-couchdb
import PouchDB from 'pouchdb-browser'
import {BUD_COUCH_URL, DB_NAME} from "../../constants";
import {DB_PUSH, Loading} from "../../utils/db";
import {BUDGET_PREFIX, SHORT_BUDGET_PREFIX, ACC_PREFIX, KEY_DIVIDER, SCHED_EXECUTED_PREFIX} from "../account/keys";
import {handle_db_error, DB_PULL, DB_CHANGE, DB_PAUSED, DB_ACTIVE, DB_COMPLETE, DB_DENIED, DB_ERROR} from "../../utils/db";
import {ACC_DOC_TYPE, TXN_DOC_TYPE, TXN_SCHED_DOC_TYPE} from "../account/budget_const";
import {getDateIso, datediff} from "../../utils/date"
const cron = require("node-cron");
const db = new PouchDB(DB_NAME); // creates a database or opens an existing one
// https://github.com/pouchdb/upsert
PouchDB.plugin(require('pouchdb-upsert'))
// Note: if not syncing then ensure cors is enabled in fauxton: http://127.0.0.1:5984/_utils/#_config/nonode@nohost/cors

// Updating documents correctly - https://pouchdb.com/guides/documents.html#updating-documents%E2%80%93correctly
// https://github.com/FortAwesome/react-fontawesome#installation
// couchdb best practices: https://github.com/jo/couchdb-best-practices
// promises: https://blog.bitsrc.io/understanding-promises-in-javascript-c5248de9ff8f
// https://medium.com/@Charles_Stover/optimal-file-structure-for-react-applications-f3e35ad0a145
// https://www.codecademy.com/search?query=reactjs
// https://www.codecademy.com/articles/how-to-create-a-react-app
// https://www.taniarascia.com/getting-started-with-react/
// https://stories.jotform.com/7-reasons-why-you-should-use-react-ad420c634247#.skkxdv33n
// https://stories.jotform.com/offline-first-web-applications-d2d321444510
// https://www.valentinog.com/blog/redux/
// https://reactstrap.github.io/
// https://www.npmjs.com/package/react-datepicker
// https://github.com/algm/reactstrap-confirm
// https://www.npmjs.com/package/react-number-format
// https://blog.logrocket.com/a-guide-to-usestate-in-react-ecb9952e406c/
// https://medium.com/the-andela-way/react-drag-and-drop-7411d14894b9
// https://codepen.io/lopis/pen/XYgRKz
// no need to declare state or bind methods in constructor: https://hackernoon.com/the-constructor-is-dead-long-live-the-constructor-c10871bea599
// . you should use functional components if you are writing a presentational component which doesn’t have its own state
// or needs to access a lifecycle hook
// . you generally want to avoid changing the DOM directly when using react
// files: generally, reusable components go into their own files whereas components that are dependent on each other
//        for a specific purpose go in the same file
// Wasabi - pep up your finances
const CONFIG_ID = "wasabi_config"
const DEFAULT_SKIN_ID = "1"

// https://www.digitalocean.com/community/tutorials/nodejs-cron-jobs-by-examples
// TODO: do this when I have finished everything else
    // TODO: setup cron on server (for all users) and not in client!!!!
cron.schedule("* * * * *", function () {
    const budgetsOnlyKey = BUDGET_PREFIX
    db.allDocs({
        startkey: budgetsOnlyKey,
        endkey: budgetsOnlyKey + '\uffff',
        include_docs: true
    }).then(function (results) {
        if (results.rows.length > 0) {
            for (const row of results.rows) {
                const bud = new Budget(row.doc)
                AccountsContainer.fetchData(null, db, bud, processSchedule)
            }
        }
    })
    .catch(function (err) {
        console.log(err)
    })
});

// TODO: do the budget code
    // TODO: see getMonthItems
    // TODO: collapse all cats: https://youtu.be/5vOsZH0v1-8?t=316
// TODO: reports https://youtu.be/5vOsZH0v1-8?t=500
// TODO: do other todos
// TODO: do the report code

class App extends Component {

    state = {budget: null, showAccList: true, loading: true, budgets: [],
             dbState: null, dir: null, skinId: null, txnCreatedBySched: null}

    componentDidMount() {
        // https://pouchdb.com/api.html#replication
        const self = this
        let direction = null
        db.sync(BUD_COUCH_URL, {
            live: true,
            retry: true
        }).on('change', function (info) {
            //  This event fires when the replication has written a new document. info will contain details about the
            //  change. info.docs will contain the docs involved in that change.
            const firstDoc = info.change.docs[0]
            const txnCreatedBySched = (direction === DB_PUSH && firstDoc.type === TXN_DOC_TYPE && typeof firstDoc.createdBySched !== "undefined" && firstDoc.createdBySched !== null)
            direction = info.direction
            self.setState({dbState: DB_CHANGE, dir: direction, txnCreatedBySched: txnCreatedBySched}, function(){
                // if remote db updated then refresh
                if (direction === DB_PULL || txnCreatedBySched)
                    self.setupApp()
            })
        }).on('paused', function (err) {
            // This event fires when the replication is paused, either because a live replication is waiting for
            // changes, or replication has temporarily failed, with err, and is attempting to resume.
            if (self.state.dbState === null || self.state.dbState === DB_ACTIVE)
                self.setupApp()
            self.setState({dbState: DB_PAUSED})
        }).on('active', function () {
            // This event fires when the replication starts actively processing changes; e.g. when it recovers
            // from an error or new changes are available.
            self.setState({dbState: DB_ACTIVE})
        }).on('denied', function (err) {
            // This event fires if a document failed to replicate due to validation or authorization errors
            self.setState({dbState: DB_DENIED}, function(){
                handle_db_error(null, "A document failed to replicate due to validation or authorization errors.")
            })
        }).on('complete', function (info) {
            // This event fires when replication is completed or cancelled. In a live replication, only cancelling the
            // replication should trigger this event. info will contain details about the replication.
            // handle complete
            self.setState({dbState: DB_COMPLETE})
        }).on('error', function (err) {
            // This event is fired when the replication is stopped due to an unrecoverable failure.
            self.setState({dbState: DB_ERROR}, function(){
                handle_db_error(null, "Replication has stopped due to an unrecoverable failure.")
            })
        });
    }

    gotoAllBudgets = () => {
        this.updateActiveBudget(null)
    }

    budgetSelected = (id) => {
        this.updateActiveBudget(id)
    }

    updateActiveBudget = (id) => {
        const self = this
        db.get(CONFIG_ID).then(function (configDoc) {
            configDoc.activeBudget = id
            return db.put(configDoc)
        }).then(function(){
            const showAccList = id === null
            let state = {showAccList: showAccList}
            if (id === null)
                state['budget'] = null
            self.setState(state, function(){
                if (id === null)
                    self.loadBudgets()
                else
                    self.loadBudgetData(id)
            })
        })
            .catch(function (err) {
            self.setState({loading: false})
            handle_db_error(err, 'Failed to update config.', true)
        });
    }

    setupApp() {
        const self = this
        // get config doc or create it if it doesn't exist
        db.get(CONFIG_ID).then(function (doc) {
            const showAccList = doc.activeBudget === null
            self.setState({showAccList: showAccList, skinId: doc.skinId}, function () {
                self.handleConfigPostGet(showAccList, doc)
            })
        })
            .catch(function (err) {
                if (err.name === "not_found") {
                    // config not found so we need to create one
                    const config = {_id: CONFIG_ID, activeBudget: null, type: "config", skinId: DEFAULT_SKIN_ID}
                    db.put(config).then(function () {
                        self.handleConfigPostGet(true, null)
                    })
                        .catch(function (err) {
                            self.setState({loading: false})
                            handle_db_error(err, 'Failed to put the configuration.', true)
                        })
                } else {
                    self.setState({loading: false})
                    handle_db_error(err, 'Failed to load the configuration.', true)
                }
            });
    }

    handleConfigPostGet(showAccList, doc) {
        if (showAccList)
            this.loadBudgets()
        else
            this.loadBudgetData(doc.activeBudget)
    }

    loadBudgets() {
        const self = this
        const budgetsOnlyKey = BUDGET_PREFIX
        db.allDocs({
            startkey: budgetsOnlyKey,
            endkey: budgetsOnlyKey + '\uffff',
            include_docs: true
        }).then(function (results) {
            if (results.rows.length > 0) {
                let budgets = []
                for (const row of results.rows) {
                    const bud = new Budget(row.doc)
                    budgets.push(bud)
                }
                budgets = budgets.sort((a, b) => (a.lastOpened < b.lastOpened) ? 1 : -1)
                self.setState({loading: false, budgets: budgets})
            }
            else
                self.setState({loading: false})
        })
            .catch(function (err) {
                self.setState({loading: false})
                handle_db_error(err, 'Failed to check for budgets.', true)
            });
    }

    loadBudgetData(id) {
        const self = this
        db.get(id, {
            include_docs: true
        }).then(function (bud) {
            bud.lastOpened = new Date()
            const budget = new Budget(bud)
            self.setState({budget: budget}, function(){
                self.refreshBudgetItem(budget)
                db.put(bud)
            })
        })
            .catch(function (err) {
                self.setState({loading: false})
                handle_db_error(err, 'Failed to load the budget.', true)
            })
    }

    skinChanged = (event) => {
        const skinId = event.target.value
        const self = this
         db.get(CONFIG_ID).then(function (doc) {
             doc.skinId = skinId
             db.put(doc).then(function(){
                self.setState({skinId: skinId})
             })
         })
            .catch(function (err) {
                handle_db_error(err, 'Failed to save the skin change', true)
            })
    }

    configIsLoaded = () => {
        return this.state.skinId !== null
    }

    deleteBudget = (budget) => {
        const self = this
        this.setState({loading: true}, function(){
            db.get(budget.id).then(function(doc){
                return db.remove(doc);
            })
                .then(function(){
                    // delete accs, txns, cats, catitems and monthCatItem
                    const key = SHORT_BUDGET_PREFIX + budget.shortId
                    db.allDocs({startkey: key, endkey: key + '\uffff', include_docs: true})
                        .then(function (results) {
                            for (const row of results.rows)
                            {
                                const item = row.doc
                                db.get(item._id).then(function(doc){
                                    return db.remove(doc)
                                }).catch(function (err) {
                                    // do nothing
                                })
                            }
                            // update state
                            const buds = self.state.budgets.filter((bud, i) => {return budget.id !== bud.id})
                            self.setState({budgets: buds, loading: false})
                        })
                    // delete schedEx
                    const schedExKey = SCHED_EXECUTED_PREFIX + SHORT_BUDGET_PREFIX + budget.shortId
                    db.allDocs({startkey: schedExKey, endkey: schedExKey + '\uffff', include_docs: true})
                        .then(function (results) {
                            for (const row of results.rows)
                            {
                                const item = row.doc
                                db.get(item._id).then(function(doc){
                                    return db.remove(doc)
                                }).catch(function (err) {
                                    // do nothing
                                })
                            }
                        })
            })
            .catch(function (err) {
                self.setState({loading: false})
            })
        })
    }

    refreshBudgetItem = (targetBud) => {
        let newList = []
        let found = false
        for (let bud of this.state.budgets)
        {
            if (bud.id === targetBud.id)
            {
                newList.push(targetBud)
                found = true
            }
            else
                newList.push(bud)
        }
        if (!found)
            newList.push(targetBud)
        this.setState({budgets: newList})
    }

    // load up backup (changing all ids to new ones)
    applyBudget = (budgetJson) => {
        const self = this
        const budDetails = Budget.getBudgetFromJson(budgetJson)
        const bud = budDetails[0]
        const schedExs = budDetails[1]
        let jsonItems = bud.generateJson()
        jsonItems = jsonItems.concat(schedExs)
        const jsonStr = JSON.stringify(jsonItems, null, 4)
        const jsonObjs = JSON.parse(jsonStr)
        db.bulkDocs(jsonObjs)
            .then(function(){
                self.loadBudgets()
            })
            .catch(function (err) {
                    handle_db_error(err, 'Failed restore the budget.', true)
                })
    }

    render() {
        return (
            <div>
                {this.configIsLoaded() &&
                    <link rel="stylesheet" type="text/css" href={ process.env.PUBLIC_URL + '/theme' + this.state.skinId + '.css'} />}
                {/*show all budgets*/}
                {
                    this.configIsLoaded() && this.state.showAccList &&
                    <BudgetList db={db}
                                budgets={this.state.budgets}
                                refreshListItem={this.refreshBudgetItem}
                                skinChanged={this.skinChanged}
                                skinId={this.state.skinId}
                                applyBudget={this.applyBudget}
                                onClick={this.budgetSelected}
                                deleteBudget={this.deleteBudget}
                                dbState={this.state.dbState}/>
                }
                {/*show accounts & transactions etc*/}
                {
                    this.configIsLoaded() && this.state.budget && !this.state.showAccList &&
                    <AccountsContainer
                        db={db}
                        gotoAllBudgets={this.gotoAllBudgets}
                        budget={this.state.budget}
                        dbState={this.state.dbState}
                        dir={this.state.dir}
                        txnCreatedBySched={this.state.txnCreatedBySched}
                    />
                }
                {/*show loading symbol*/}
                {
                    !this.state.budget &&
                    <Loading loading={this.state.loading}/>
                }
            </div>
        )
    }
}

export default App