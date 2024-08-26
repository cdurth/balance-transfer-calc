import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './DebtCalculator.css';
import { Line } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const DebtCalculator = () => {
    const [initialDebt, setInitialDebt] = useState(9000);
    const [balanceTransferFeeRate, setBalanceTransferFeeRate] = useState(0.05);
    const [desiredMonths, setDesiredMonths] = useState(20);
    const [additionalPayment, setAdditionalPayment] = useState(0);
    const [showCustomAPY, setShowCustomAPY] = useState(false);
    const [customAPY, setCustomAPY] = useState(21);
    const [currentMonthlyPayment, setCurrentMonthlyPayment] = useState(0);

    const calculateRemainingBalance = (initialBalance, monthlyPayment, months, interestRate = 0) => {
        let balance = initialBalance;
        let balances = [];
        const monthlyInterestRate = interestRate / 12;

        for (let i = 0; i < months; i++) {
            balance += balance * monthlyInterestRate;
            balance -= monthlyPayment;
            balances.push(Math.max(balance, 0));
            if (balance <= 0) {
                break;
            }
        }

        while (balances.length < months) {
            balances.push(0);
        }

        return balances;
    };

    const trimBalancesAtZero = (balances) => {
        let zeroIndex = balances.indexOf(0);
        return zeroIndex !== -1 ? balances.slice(0, zeroIndex + 1) : balances;
    };

    const handleCalculation = () => {
        let initialBalanceWithFee = initialDebt * (1 + balanceTransferFeeRate);
        let lowerBound = initialBalanceWithFee / desiredMonths;
        let upperBound = initialBalanceWithFee;

        while (upperBound - lowerBound > 0.01) {
            let midPayment = (lowerBound + upperBound) / 2;
            let remainingBalance = calculateRemainingBalance(initialBalanceWithFee, midPayment, desiredMonths);
            if (remainingBalance[remainingBalance.length - 1] > 0) {
                lowerBound = midPayment;
            } else {
                upperBound = midPayment;
            }
        }

        let requiredPayment = ((lowerBound + upperBound) / 2).toFixed(2);
        let totalPaymentWithAdditional = (parseFloat(requiredPayment) + (parseFloat(additionalPayment) || 0)).toFixed(2);

        let balancesWithPayment = calculateRemainingBalance(initialBalanceWithFee, requiredPayment, desiredMonths);
        let balancesWithAdditionalPayment = calculateRemainingBalance(initialBalanceWithFee, totalPaymentWithAdditional, desiredMonths);

        let balancesWithCustomAPY = [];
        let balancesWithCurrentMonthlyPayment = [];
        let payOffMonthWithCurrentMonthlyPayment = null;
        let payOffMonthWithCustomAPY = null;

        if (showCustomAPY) {
            balancesWithCustomAPY = calculateRemainingBalance(initialDebt, totalPaymentWithAdditional, 1000, customAPY / 100);
            payOffMonthWithCustomAPY = balancesWithCustomAPY.findIndex(balance => balance === 0) + 1;

            if (currentMonthlyPayment > 0) {
                balancesWithCurrentMonthlyPayment = calculateRemainingBalance(initialDebt, currentMonthlyPayment, 1000, customAPY / 100);
                payOffMonthWithCurrentMonthlyPayment = balancesWithCurrentMonthlyPayment.findIndex(balance => balance === 0) + 1;
            }
        }

        // Determine the max months to show in the table
        const maxMonths = Math.max(
            desiredMonths,
            payOffMonthWithCurrentMonthlyPayment || 0,
            payOffMonthWithCustomAPY || 0
        );

        let monthsWithPayment = Array.from({ length: maxMonths }, (_, i) => i + 1);

        const getBeneficialMonthsToPayoff = () => {
            const balanceIndex = balancesWithAdditionalPayment.findIndex(balance => balance === 0);
            return balanceIndex !== -1 ? balanceIndex + 1 : desiredMonths;
        };

        const getTotalAmountPaid = (initialBalance, monthlyPayment, interestRate = 0, requiredMonths = maxMonths) => {
            let totalAmount = 0;
            let balance = initialBalance;
            const monthlyInterestRate = interestRate / 12;

            for (let i = 0; i < requiredMonths; i++) {
                balance += balance * monthlyInterestRate;
                totalAmount += Math.min(balance, monthlyPayment);
                balance -= monthlyPayment;
                if (balance <= 0) break;
            }
            return totalAmount.toFixed(2);
        };

        const totalAmountPaidWithPayment = getTotalAmountPaid(initialBalanceWithFee, requiredPayment);
        const totalAmountPaidWithAdditionalPayment = getTotalAmountPaid(initialBalanceWithFee, totalPaymentWithAdditional);
        const totalAmountPaidWithCustomAPY = showCustomAPY ? getTotalAmountPaid(initialDebt, totalPaymentWithAdditional, customAPY / 100, maxMonths) : null;
        const totalAmountPaidWithCurrentMonthlyPayment = showCustomAPY && currentMonthlyPayment > 0 ? getTotalAmountPaid(initialDebt, currentMonthlyPayment, customAPY / 100, maxMonths) : null;

        balancesWithPayment = trimBalancesAtZero(balancesWithPayment);
        balancesWithAdditionalPayment = trimBalancesAtZero(balancesWithAdditionalPayment);
        if (showCustomAPY) {
            balancesWithCustomAPY = trimBalancesAtZero(balancesWithCustomAPY);
            if (balancesWithCurrentMonthlyPayment.length > 0) {
                balancesWithCurrentMonthlyPayment = trimBalancesAtZero(balancesWithCurrentMonthlyPayment);
            }
        }

        return {
            requiredPayment,
            debtTableWithPayment: monthsWithPayment.map((month, index) => ({
                month,
                remainingDebt: (balancesWithPayment[index] || 0).toFixed(2),
                remainingDebtWithAdditional: (balancesWithAdditionalPayment[index] || 0).toFixed(2),
                remainingDebtWithCustomAPY: showCustomAPY ? ((balancesWithCustomAPY[index] || 0).toFixed(2)) : null,
                remainingDebtWithCurrentMonthlyPayment: balancesWithCurrentMonthlyPayment.length > 0 ? ((balancesWithCurrentMonthlyPayment[index] || 0).toFixed(2)) : null
            })),
            totalAmountPaidWithPayment,
            totalAmountPaidWithAdditionalPayment,
            totalAmountPaidWithCustomAPY,
            totalAmountPaidWithCurrentMonthlyPayment,
            chartData: {
                labels: monthsWithPayment.slice(0, Math.max(balancesWithPayment.length, balancesWithAdditionalPayment.length, balancesWithCustomAPY.length || 0, balancesWithCurrentMonthlyPayment.length || 0)),
                datasets: [
                    {
                        label: 'Remaining Debt ($)',
                        data: balancesWithPayment,
                        fill: false,
                        backgroundColor: 'rgba(153,102,255,1)',
                        borderColor: 'rgba(153,102,255,1)',
                    },
                    {
                        label: 'Remaining Debt with Additional Payment ($)',
                        data: balancesWithAdditionalPayment,
                        fill: false,
                        backgroundColor: 'rgba(255,99,132,1)',
                        borderColor: 'rgba(255,99,132,1)',
                    },
                    showCustomAPY && {
                        label: 'Remaining Debt with Custom APY ($)',
                        data: balancesWithCustomAPY,
                        fill: false,
                        backgroundColor: 'rgba(255,206,86,1)',
                        borderColor: 'rgba(255,206,86,1)',
                    },
                    balancesWithCurrentMonthlyPayment.length > 0 && {
                        type: 'bar',
                        label: 'Remaining Debt with Custom APY and Payment ($)',
                        data: balancesWithCurrentMonthlyPayment,
                        backgroundColor: 'rgba(54,162,235,1)',
                        borderColor: 'rgba(54,162,235,1)',
                    },
                ].filter(Boolean),
            },
            monthsToPayOffWithAdditional: getBeneficialMonthsToPayoff(),
            totalPaymentWithAdditional,
            payOffMonthWithCurrentMonthlyPayment,
            balancesWithCurrentMonthlyPayment // Ensure this is returned for use in the UI
        };
    };

    const {
        requiredPayment,
        debtTableWithPayment,
        totalAmountPaidWithPayment,
        totalAmountPaidWithAdditionalPayment,
        totalAmountPaidWithCustomAPY,
        totalAmountPaidWithCurrentMonthlyPayment,
        chartData,
        monthsToPayOffWithAdditional,
        totalPaymentWithAdditional,
        payOffMonthWithCurrentMonthlyPayment,
        balancesWithCurrentMonthlyPayment // Pulling this out for rendering use
    } = handleCalculation();

    const getHighlightStyle = (value, color) => {
        return value === "0.00" ? { backgroundColor: color } : {};
    };

    return (
        <div className="container mt-5">
            <h1 className="text-center mb-4">Balance Transfer Debt Payoff Calculator</h1>
            <div className="card mb-4">
                <div className="card-body">
                    <h5 className="card-title">Input Parameters</h5>
                    <div className="row">
                        <div className="col-md-6 mb-3">
                            <div className="form-group">
                                <label htmlFor="initialDebt">Initial Debt</label>
                                <input
                                    type="number"
                                    className="form-control"
                                    id="initialDebt"
                                    value={initialDebt}
                                    onChange={(e) => setInitialDebt(parseFloat(e.target.value))}
                                />
                            </div>
                        </div>
                        <div className="col-md-6 mb-3">
                            <div className="form-group">
                                <label htmlFor="balanceTransferFeeRate">Balance Transfer Fee Rate</label>
                                <input
                                    type="number"
                                    className="form-control"
                                    id="balanceTransferFeeRate"
                                    value={balanceTransferFeeRate}
                                    onChange={(e) => setBalanceTransferFeeRate(parseFloat(e.target.value))}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="row">
                        <div className="col-md-6 mb-3">
                            <div className="form-group">
                                <label htmlFor="desiredMonths">Desired Months</label>
                                <input
                                    type="number"
                                    className="form-control"
                                    id="desiredMonths"
                                    value={desiredMonths}
                                    onChange={(e) => setDesiredMonths(parseFloat(e.target.value))}
                                />
                            </div>
                        </div>
                        <div className="col-md-6 mb-3">
                            <div className="form-group">
                                <label htmlFor="additionalPayment">Additional Payment</label>
                                <input
                                    type="number"
                                    className="form-control"
                                    id="additionalPayment"
                                    value={additionalPayment}
                                    onChange={(e) => setAdditionalPayment(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="form-check form-switch mb-3">
                        <input
                            className="form-check-input"
                            type="checkbox"
                            id="customAPYToggle"
                            checked={showCustomAPY}
                            onChange={(e) => setShowCustomAPY(e.target.checked)}
                        />
                        <label className="form-check-label" htmlFor="customAPYToggle">Include Credit Card APY Calculation</label>
                    </div>
                    {showCustomAPY && (
                        <>
                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <div className="form-group">
                                        <label htmlFor="customAPY">APY (%)</label>
                                        <input
                                            type="number"
                                            className="form-control"
                                            id="customAPY"
                                            value={customAPY}
                                            onChange={(e) => setCustomAPY(parseFloat(e.target.value))}
                                        />
                                    </div>
                                </div>
                                <div className="col-md-6 mb-3">
                                    <div className="form-group">
                                        <label htmlFor="currentMonthlyPayment">Current Monthly Payment</label>
                                        <input
                                            type="number"
                                            className="form-control"
                                            id="currentMonthlyPayment"
                                            value={currentMonthlyPayment}
                                            onChange={(e) => setCurrentMonthlyPayment(parseFloat(e.target.value))}
                                        />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="result text-center">
                <h2 className="mb-4">Results</h2>
                <h4 className="text-muted mb-3">
                    Required Monthly Payment to pay off the debt in {desiredMonths} months: <strong>${requiredPayment}</strong>
                </h4>
                {additionalPayment > 0 && monthsToPayOffWithAdditional < desiredMonths && (
                    <h5 className="text-success mb-3">
                        With an additional payment of ${additionalPayment} per month (total: ${totalPaymentWithAdditional}), you will pay off the debt in {monthsToPayOffWithAdditional} months, which is {desiredMonths - monthsToPayOffWithAdditional} months sooner.
                    </h5>
                )}
                {showCustomAPY && currentMonthlyPayment > 0 && payOffMonthWithCurrentMonthlyPayment && (
                    <h5 className="mb-3" style={{ color: 'rgba(54,162,235,1)' }}>
                        With a monthly payment of ${currentMonthlyPayment}, it will take approximately {payOffMonthWithCurrentMonthlyPayment} months to pay off the debt with the current APY.
                    </h5>
                )}
                <div className="mt-5">
                    <Line data={chartData} />
                </div>
                <div className="table-responsive mt-4">
                    <table className="table table-striped table-bordered">
                        <thead className="thead-dark">
                            <tr>
                                <th>Month</th>
                                <th>Remaining Debt ($)</th>
                                <th>Remaining Debt with Additional Payment ($)</th>
                                {showCustomAPY && <th>Remaining Debt with Custom APY ($)</th>}
                                {balancesWithCurrentMonthlyPayment.length > 0 && <th>Remaining Debt with Custom APY and Payment ($)</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {debtTableWithPayment.map((row, index) => (
                                <tr key={index}>
                                    <td><strong>{row.month}</strong></td>
                                    <td style={getHighlightStyle(row.remainingDebt, 'rgba(153,102,255,1)')}>{row.remainingDebt}</td>
                                    <td style={getHighlightStyle(row.remainingDebtWithAdditional, 'rgba(255,99,132,1)')}>{row.remainingDebtWithAdditional}</td>
                                    {showCustomAPY && <td style={getHighlightStyle(row.remainingDebtWithCustomAPY, 'rgba(255,206,86,1)')}>{row.remainingDebtWithCustomAPY}</td>}
                                    {balancesWithCurrentMonthlyPayment.length > 0 && <td style={getHighlightStyle(row.remainingDebtWithCurrentMonthlyPayment, 'rgba(54,162,235,1)')}>{row.remainingDebtWithCurrentMonthlyPayment}</td>}
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr>
                                <th>Total Amount Paid</th>
                                <th>{totalAmountPaidWithPayment}</th>
                                <th>{totalAmountPaidWithAdditionalPayment}</th>
                                {showCustomAPY && <th>{totalAmountPaidWithCustomAPY}</th>}
                                {balancesWithCurrentMonthlyPayment.length > 0 && <th>{totalAmountPaidWithCurrentMonthlyPayment}</th>}
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DebtCalculator;