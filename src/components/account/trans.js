import React, {Component} from 'react'
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import * as PropTypes from "prop-types";
import MSelect from "../../utils/select";
import Ccy from "../../utils/ccy";
import {isItNumber, strToFloat} from "../../utils/numbers";


export default class Trans {
    constructor(doc) {
        this.tid = doc._id
        this.trev = doc._rev
        this.tacc = doc.acc
        this.tdate = new Date(doc.date)
        this.tflagged = doc.flagged
        this.tclear = doc.cleared
        this.tout = doc.out
        this.tin = doc.in
        this.tcatItem = doc.catItem
        this.tpay = doc.payee
        this.tmemo = doc.memo
        this.tpayee = doc.payee
    }

    asJson()
    {
        return {
                "_id": this.id,
                "_rev": this.rev,
                "type": "txn",
                "acc": this.acc,
                "flagged": this.flagged,
                "date": this.date.toISOString().substr(0, 10),
                "catItem": "5",
                "memo": this.memo,
                "out": this.out,
                "in": this.in,
                "payee": this.payee,
                "cleared": this.clear
        }
    }

    get amount() {
        if (this.out === "")
            this.out = 0
        return this.out > 0 ? -1 * this.out : this.in
    }

    get id() {
        return this.tid
    }

    get payee() {
        return this.tpayee
    }

    get acc() {
        return this.tacc
    }

    get rev() {
        return this.trev
    }

    set rev(rev) {
        this.trev = rev
    }

    get date() {
        return this.tdate
    }

    set date(date) {
        this.tdate = date
    }

    get clear() {
        return this.tclear
    }

    set clear(clear) {
        this.tclear = clear
    }

    get flagged() {
        return this.tflagged
    }

    set flagged(flagged) {
        this.tflagged = flagged
    }

    get out() {
        return this.tout
    }

    set out(outFlow) {
        this.tout = outFlow
    }

    get in() {
        return this.tin
    }

    set in(inFlow) {
        this.tin = inFlow
    }

    get catItem() {
        return this.tcatItem
    }

    set catItem(catItem) {
        this.tcatItem = catItem
    }

    get payee() {
        return this.tpay
    }

    set payee(pay) {
        this.tpay = pay
    }

    get memo() {
        return this.tmemo
    }

    set memo(memo) {
        this.tmemo = memo
    }
}

// TODO: do I need all this?
export class TxnForm extends Component {
    constructor(props) {
        super(props)

        this.initialState = {
            name: '',
            job: '',
        }

        this.state = this.initialState
    }

    handleChange = event => {
        const {name, value} = event.target

        this.setState({
            [name]: value,
        })
    }

    render() {
        const {name, job} = this.state;
        const {accounts, payees} = this.props;
        return <TxnTr name={name} job={job} handleChange={this.handleChange} accounts={accounts} payees={payees}/>;
    }
}

// TODO: make each field a component
// TODO: get payee field to work
// TODO: allow to search in payee field
// TODO: use correct fields
// TODO: use in loop that print out all txns
// TODO: suss how to handle many txns
// TODO: instead of using d-none to hide/show, use the shouldComponentUpdate() function
// TODO: maybe only pass budget down instead of individual parts
// https://www.npmjs.com/package/react-datepicker
//      https://github.com/Hacker0x01/react-datepicker/blob/master/docs/datepicker.md
//      https://reactdatepicker.com/
//      https://www.unicode.org/reports/tr35/tr35-dates.html#Date_Field_Symbol_Table
export class TxnDate extends Component {
    state = {
        startDate: new Date()
    };
    handleChange = date => {
        this.setState({
            startDate: date
        });
        this.props.handleChange(date)
    };
    render() {
    const {hasFocus, readOnly, startDate} = this.props
        return <DatePicker
                selected={this.state.startDate}
                onChange={this.handleChange}
                dateFormat='E MMM dd yyyy'
                startOpen={hasFocus}
                tabIndex={1}
                className='form-control'
                readOnly={readOnly}
                startDate={startDate}
                calendarClassName="date_pick"
            />
    }
}
TxnDate.defaultProps = {
    readOnly: false
}
// https://react-select.com/styles#style-object
TxnDate.propTypes = {
    selected: PropTypes.any,
    onChange: PropTypes.func
};
// const options = [
//   { value: 'tesco', label: 'tesco' },
//   { value: 'spotify', label: 'spotify' },
//   { value: 'council', label: 'council' }
// ]

// searchable select: https://github.com/JedWatson/react-select
// https://react-select.com/advanced#controlled-props
class TxnPayee extends Component {
    render() {
        // const {payees, hasFocus, changed, selectedPayee} = this.props
        const {hasFocus, changed, selectedPayee, options} = this.props
        // TODO: remove
        // let accOptions
        // if (this.props.accounts != null)
        //     accOptions = this.props.accounts.map((data) =>
        //         <option
        //             key={data.id}
        //             value={data.id}
        //         >
        //             {data.name}
        //         </option>
        //     )
        // else
        //     accOptions = ''
        // let payeeOptions = payees.map((data) =>
        //     <option
        //         key={data.id}
        //         value={data.id}
        //     >
        //         {data.name}
        //     </option>
        // );
        // TODO: remove
        // return <select className='form-controlc txn_payee'>
        //     <optgroup label="Transfer to/from account">
        //         {accOptions}
        //     </optgroup>
        //     >
        //     <optgroup label="Previous payees">
        //         {payeeOptions}
        //     </optgroup>>
        // </select>;
// TODO: get this to work with payees and accounts
// TODO: if not found then add to payee list when txn added/modified

        return <MSelect options={options} hasFocus={hasFocus} changed={changed} value={selectedPayee}/>
    }
}

TxnPayee.propTypes = {
    accOptions: PropTypes.any,
    payeeOptions: PropTypes.any
};

// https://blog.logrocket.com/complete-guide-building-smart-data-table-react/
function TxnTd(props) {
    const fldName = props.fld + "Fld"
    const editField = props.trState.editField
    const txnInEdit = props.trState.txnInEdit
    return <td fld_id={fldName} onClick={props.onClick}>
        {props.editRow ? <div>
            <input autoFocus={editField === fldName}
                       className={"form-control"}
                       type='text'
                       value={txnInEdit[props.fld]}
                       onChange={props.onChange}/>
                {props.incSave && <div id="txn_save">
                    <button onClick={(event => props.saveTxn(txnInEdit))} type="button "
                            className='btn prim_btn'>Save
                    </button>
                    <button onClick={(event => props.cancelEditTxn(event))} type="button "
                            className='btn btn-secondary'>Cancel
                    </button>
                </div>}
            </div>
            :
            props.isCcy ? <Ccy verbose={false} amt={props.row[props.fld]}/> : props.row[props.fld]}
    </td>
}
// class TxnTd extends Component {
//
//         handleChange = (event) => {
//         const target = event.target
//         const value = target.value
//         const name = target.name
//         let state = {
//             [name]: value,
//         }
//         console.log(state)
//         this.setState(state)
//     }
//
//     render() {
//             console.log('xxx')
//         const fldName = this.props.fld + "Fld"
//         const editField = this.props.trState.editField
//         const txnInEdit = this.props.trState.txnInEdit
//         return <td fld_id={fldName} onClick={this.props.onClick}>
//             {this.props.editRow ? <div>
//                     {this.props.isCcy ? <Ccy verbose={true} amt={this.props.row[this.props.fld]} displayType={'input'} name={this.props.name}
//                                         allowNegative={false} onValueChange={(values) => {
//     const {formattedValue, value} = values;
//     // formattedValue = $2,223
//     // value ie, 2223
//     this.setState({fldName: formattedValue})
//   }}/>
//                         :
//                         <input autoFocus={editField === fldName}
//                                className={"form-control"}
//                                type='text'
//                                value={txnInEdit[this.props.fld]}
//                                onChange={this.props.onChange}/>}
//                     {this.props.incSave && <div id="txn_save">
//                         <button onClick={(event => this.props.saveTxn(txnInEdit))} type="button "
//                                 className='btn prim_btn'>Save
//                         </button>
//                         <button onClick={(event => this.props.cancelEditTxn(event))} type="button "
//                                 className='btn btn-secondary'>Cancel
//                         </button>
//                     </div>}
//                 </div>
//                 :
//                 this.props.isCcy ? <Ccy verbose={false} amt={this.props.row[this.props.fld]}/> : this.props.row[this.props.fld]}
//         </td>
//     }
// }

TxnTd.defaultProps = {
    incSave: false,
    isCcy: false
}

TxnTd.propTypes = {
    onClick: PropTypes.func,
    editRow: PropTypes.bool,
    editField: PropTypes.any,
    txnInEdit: PropTypes.any,
    onChange: PropTypes.func,
    row: PropTypes.any
};

// https://github.com/adazzle/react-data-grid
export class TxnTr extends Component {
    // TODO: get selection and state to work - maybe just use a payee_value state?
    state = {editField: null, selectedPayee: {label: 'spotify', value: 'spotify'}, txnInEdit: null}
    tdSelected = (event) => {
        this.setState({editField: event.target.getAttribute('fld_id')})
    }

    txnSelected = (event, row) => {
        // TODO: handle drop down
        if (typeof event.target.type === "undefined")
            this.props.txnSelected(event, row)
    }

    componentDidMount() {
        if (this.props.row != null)
        {
            // note: {...} does not appear to clone the class methods so use following instead:
            //      https://stackoverflow.com/questions/41474986/how-to-clone-a-javascript-es6-class-instance
            const txnInEdit = Object.assign( Object.create( Object.getPrototypeOf(this.props.row)), this.props.row)
            this.setState({txnInEdit: txnInEdit})
        }
    }

    handlePayeeChange = selectedOption => {
        this.setState({selectedPayee: selectedOption});
    }

    handleDateChange = (date) => {
        // this.txnInEdit.date = date
        // TODO: code this
        // this.setState({target: date.toISOString().substr(0, 10)})
    }

    handleInputChange = (event, fld, isCcy) => {
        let val = event.target.value
        let txnInEdit = this.state.txnInEdit
        // if ccy then ensure only floats allowed, I did it like this as using NumberFormat (inside CCY)
        // lead to all kinds of state issues
        if (isCcy)
        {
            val = strToFloat(val, "0")
            // only allow in or out
            if (fld === 'in')
                txnInEdit.out = 0
            else
                txnInEdit.in = 0
        }
        txnInEdit[fld] = val
        this.setState({txnInEdit: txnInEdit})
    }


    // inout value: https://medium.com/capital-one-tech/how-to-work-with-forms-inputs-and-events-in-react-c337171b923b
    render() {
        const {row, isChecked, txnSelected, toggleTxnCheck, toggleFlag, toggleCleared, editTxn,
        accounts, payees, saveTxn, cancelEditTxn} = this.props
        if (typeof row == 'undefined')
            return (<tr></tr>)
        else
        {
            const editRow = editTxn === row.id
            return (
                // TODO: dont use ID twice in each row below
                // TODO: generalise below into single XMl
             <tr className={isChecked ? 'table-warning' : ''}
                 onClick={(event) => this.txnSelected(event, row)}>
                 {/* checkbox */}
                 <td className="txn_sel" fld_id="selFld" onClick={(event => this.tdSelected(event))}>
                     <input onChange={(event) => toggleTxnCheck(event, row)}
                            type="checkbox" checked={isChecked}/>
                 </td>
                 {/* flagged */}
                 <td fld_id="flagFld" onClick={(event => this.tdSelected(event))}>
                     <i onClick={() => toggleFlag(row, true)}
                        className={'far fa-flag flag' + (row.flagged ? ' flagged' : '')}></i>
                 </td>

                 {/* TODO: code date */}
                 {/* TODO: code drop downs */}
                 <td fld_id="dateFld" onClick={(event => this.tdSelected(event))}>
                     {/* TODO: use a constant for 'dateFld' and 'payFld' etc */}
                     {editRow ? <TxnDate handleChange={this.handleDateChange}
                                         hasFocus={editRow && this.state.editField === 'dateFld'}/> : row.date.toDateString()}</td>
                 <td fld_id="payFld" className="table_ddown" onClick={(event => this.tdSelected(event))}>
                     {editRow ? <TxnPayee accounts={accounts} options={payees}
                                          hasFocus={editRow && this.state.editField === 'payFld'}
                                          changed={this.handlePayeeChange}
                                          selectedPayee={this.state.selectedPayee}/> : row.payeeName}</td>
                 <td fld_id="catFld" onClick={(event => this.tdSelected(event))}>
                     {editRow ?
                         <input className={"form-control"} type='text' value={row.catItem}/> : row.catItemName}</td>

                 <TxnTd
                        fld="memo"
                        row={row}
                        editRow={editRow}
                        trState={this.state}
                        onClick={(event) => this.tdSelected(event)}
                        onChange={(event) => this.handleInputChange(event, "memo", false)}
                 />

                 <TxnTd
                        fld="out"
                        name="out"
                        row={row}
                        editRow={editRow}
                        trState={this.state}
                        onClick={(event) => this.tdSelected(event)}
                        onChange={(event) => this.handleInputChange(event, "out", true)}
                        isCcy={true}
                 />

                 <TxnTd
                        fld="in"
                        name="in"
                        row={row}
                        editRow={editRow}
                        trState={this.state}
                        onClick={(event) => this.tdSelected(event)}
                        onChange={(event) => this.handleInputChange(event, "in", true)}
                        isCcy={true}
                        incSave={true}
                        saveTxn={saveTxn}
                        cancelEditTxn={cancelEditTxn}
                 />

                 <td fld_id="clearFld" onClick={(event => this.tdSelected(event))}>
                     <TxnCleared toggleCleared={toggleCleared} row={row} cleared={row.clear}/></td>
             </tr>
            )

        }
    }
}


export class TxnCleared extends Component {
    render() {
        return <div onClick={typeof this.props.row != 'undefined' ? () => this.props.toggleCleared(this.props.row) : false || null}
                    className={"cleared" + (this.props.cleared ? " has_cleared" : "")}>C</div>;
    }
}
