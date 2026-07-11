let myChart;

export function updateChart(labels, expensesData, savingsData, incomeData) {
    const ctx = document.getElementById('trendChart');
    if (!ctx) return;

    if (myChart) {
        myChart.data.labels = labels;
        myChart.data.datasets[0].data = incomeData;
        myChart.data.datasets[1].data = expensesData;
        myChart.data.datasets[2].data = savingsData;
        myChart.update();
        return;
    }

    Chart.defaults.color = '#8E9BAE';
    Chart.defaults.font.family = "'Inter', sans-serif";

    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    type: 'line',
                    label: 'Income',
                    data: incomeData,
                    borderColor: '#00E5FF',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 3,
                    pointBackgroundColor: '#00E5FF',
                    fill: false,
                    tension: 0.4
                },
                {
                    type: 'bar',
                    label: 'Expenses',
                    data: expensesData,
                    borderColor: '#B026FF',
                    backgroundColor: 'rgba(176,38,255,0.7)',
                    borderWidth: 1,
                    borderRadius: 4
                },
                {
                    type: 'bar',
                    label: 'Savings',
                    data: savingsData,
                    borderColor: '#00E676',
                    backgroundColor: 'rgba(0,230,118,0.7)',
                    borderWidth: 1,
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(20, 24, 34, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    padding: 10
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255,255,255,0.05)',
                        drawBorder: false
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(255,255,255,0.05)',
                        drawBorder: false
                    },
                    beginAtZero: true
                }
            }
        }
    });
}

let catChart;
export function updateCategoryChart(categoriesMap) {
    const ctx = document.getElementById('categoryChart');
    if (!ctx) return;

    const labels = Object.keys(categoriesMap);
    const dataValues = Object.values(categoriesMap);
    
    // Handle case where all are 0
    const noData = dataValues.length === 0 || dataValues.reduce((a, b) => a + b, 0) === 0;

    const baseColors = [
        '#FF3366', // Vibrant Pink/Red
        '#A3CB38', // Lime Green (was Bright Cyan, swapped with Housing)
        '#FFD32A', // Sunny Yellow
        '#5F27CD', // Deep Purple
        '#05C46B', // Vibrant Green
        '#FDA7DF', // Soft Lavender (Replaced Orange)
        '#FF9F43', // Vibrant Orange (Replaced Deep Blue)
        '#00D2D3', // Bright Cyan (was Lime Green, swapped with Wants)
        '#0984E3', // True Blue (Replaced Teal)
        '#1E272E', // Dark Grey
        '#808E9B'  // Light Grey
    ];

    const chartLabels = noData ? ['No Data'] : labels;
    const chartData = noData ? [1] : dataValues;
    const bgColors = noData ? ['rgba(255,255,255,0.05)'] : labels.map((_, i) => baseColors[i % baseColors.length]);
    const borderColors = noData ? ['transparent'] : labels.map(() => '#0F1219');

    if (catChart) {
        catChart.data.labels = chartLabels;
        catChart.data.datasets[0].data = chartData;
        catChart.data.datasets[0].backgroundColor = bgColors;
        catChart.data.datasets[0].borderColor = '#161921';
        catChart.data.datasets[0].borderWidth = 3;
        catChart.update();
        return;
    }

    catChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: chartLabels,
            datasets: [{
                data: chartData,
                backgroundColor: bgColors,
                borderColor: '#161921',
                borderWidth: 3,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: {
                legend: {
                    display: true,
                    position: 'right',
                    labels: {
                        color: '#8E9BAE',
                        font: {
                            family: "'Inter', sans-serif",
                            size: 11
                        },
                        usePointStyle: true,
                        padding: 15
                    }
                },
                tooltip: {
                    backgroundColor: '#1E2330',
                    titleColor: '#fff',
                    bodyColor: '#8E9BAE',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    padding: 10,
                    callbacks: {
                        label: function(context) {
                            if (noData) return 'No Data';
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1) + '%';
                            return ` ₹${value.toFixed(2)} (${percentage})`;
                        }
                    }
                }
            }
        }
    });
}

let healthChart;
export function updateBudgetHealthChart(income, savings, emergency, fixed, bufferPct) {
    const ctx = document.getElementById('healthChart');
    if (!ctx) return;

    let buffer = (income * bufferPct) / 100;
    let safe = income - savings - emergency - fixed - buffer;
    let deficit = 0;
    if (safe < 0) {
        deficit = Math.abs(safe);
        safe = 0;
    }

    const dataSets = [
        { label: 'Savings', data: [savings], backgroundColor: '#448AFF' },
        { label: 'Emergency Fund', data: [emergency], backgroundColor: '#69F0AE' },
        { label: 'Fixed Needs', data: [fixed], backgroundColor: '#FFCA28' },
        { label: 'Buffer', data: [buffer], backgroundColor: '#FF5252' },
        { label: 'Safe-to-Spend', data: [safe], backgroundColor: '#B388FF' }
    ];

    if (deficit > 0) {
        dataSets.push({ label: 'Deficit (Over budget)', data: [deficit], backgroundColor: '#FF8A65' });
    }

    if (healthChart) {
        healthChart.data.datasets = dataSets;
        healthChart.update();
        return;
    }

    healthChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Budget Breakdown'],
            datasets: dataSets
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { stacked: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8E9BAE' } },
                y: { stacked: true, display: false }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(20, 24, 34, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    padding: 10,
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ₹' + context.raw.toFixed(2);
                        }
                    }
                }
            }
        }
    });
}

export function resizeCharts() {
    if (myChart) myChart.resize();
    if (catChart) catChart.resize();
    if (healthChart) healthChart.resize();
}
