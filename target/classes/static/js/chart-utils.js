/* ========================================
   Chart Utilities - Canvas API
   Desenho de graficos usando Canvas puro
   ======================================== */

const ChartUtils = {
  lastSummaryData: null,

  formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency', currency: 'BRL'
    }).format(value);
  },

  monthName(isoMonth) {
    const [year, month] = isoMonth.split('-');
    const names = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    return names[parseInt(month) - 1] || isoMonth;
  },

  getStyle(prop) {
    return getComputedStyle(document.documentElement).getPropertyValue(prop).trim();
  },

  truncateText(ctx, text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let output = text;
    while (output.length > 1 && ctx.measureText(output + "...").width > maxWidth) {
      output = output.slice(0, -1);
    }
    return output + "...";
  },

  drawAreaChart(canvasId, data) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !data || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    const W = rect.width;
    const H = 280;

    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.scale(dpr, dpr);

    const pad = { top: 30, right: 20, bottom: 40, left: 70 };
    const chartW = W - pad.left - pad.right;
    const chartH = H - pad.top - pad.bottom;

    const allValues = data.flatMap(d => [d.income, d.expenses]);
    const maxVal = Math.max(...allValues, 1);
    const niceMax = Math.ceil(maxVal / 1000) * 1000;

    ctx.clearRect(0, 0, W, H);

    // Grid
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = pad.top + (chartH / gridLines) * i;
      ctx.strokeStyle = '#262a38';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(W - pad.right, y);
      ctx.stroke();

      const val = niceMax - (niceMax / gridLines) * i;
      ctx.fillStyle = '#555b73';
      ctx.font = '11px Inter, system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText((val / 1000).toFixed(0) + 'k', pad.left - 10, y + 4);
    }

    const stepX = data.length > 1 ? chartW / (data.length - 1) : chartW;

    const toY = (val) => pad.top + chartH - (val / niceMax * chartH);

    const drawCurve = (key, strokeColor, fillAlpha) => {
      const points = data.map((d, i) => ({
        x: pad.left + i * stepX,
        y: toY(d[key])
      }));

      // Area preenchida
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const cpx = (prev.x + curr.x) / 2;
        ctx.bezierCurveTo(cpx, prev.y, cpx, curr.y, curr.x, curr.y);
      }
      ctx.lineTo(points[points.length - 1].x, pad.top + chartH);
      ctx.lineTo(points[0].x, pad.top + chartH);
      ctx.closePath();

      const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH);
      grad.addColorStop(0, strokeColor.replace('1)', fillAlpha + ')'));
      grad.addColorStop(1, strokeColor.replace('1)', '0)'));
      ctx.fillStyle = grad;
      ctx.fill();

      // Linha
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const cpx = (prev.x + curr.x) / 2;
        ctx.bezierCurveTo(cpx, prev.y, cpx, curr.y, curr.x, curr.y);
      }
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();

      // Pontos
      points.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = strokeColor;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#181b26';
        ctx.fill();
      });
    };

    drawCurve('income', 'rgba(74, 222, 128, 1)', 0.12);
    drawCurve('expenses', 'rgba(248, 113, 113, 1)', 0.08);

    // Labels X
    ctx.fillStyle = '#555b73';
    ctx.font = '11px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    data.forEach((d, i) => {
      const x = pad.left + i * stepX;
      ctx.fillText(this.monthName(d.month), x, H - 12);
    });

    // Legenda
    const lx = W - pad.right - 190;
    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.roundRect(lx, 8, 10, 10, 2);
    ctx.fill();
    ctx.fillStyle = '#8990a8';
    ctx.font = '11px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Receitas', lx + 15, 17);

    ctx.fillStyle = '#f87171';
    ctx.beginPath();
    ctx.roundRect(lx + 90, 8, 10, 10, 2);
    ctx.fill();
    ctx.fillStyle = '#8990a8';
    ctx.fillText('Despesas', lx + 105, 17);
  },

  drawPieChart(canvasId, data) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !data || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    const W = rect.width;
    const useSideLegend = W >= 460;
    const maxVisibleLegendItems = useSideLegend ? 6 : 8;
    const hiddenItems = Math.max(0, data.length - maxVisibleLegendItems);
    const H = useSideLegend
      ? 280
      : Math.max(320, 240 + Math.min(maxVisibleLegendItems, data.length) * 26 + (hiddenItems > 0 ? 22 : 0));

    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, W, H);

    const total = data.reduce((s, d) => s + d.amount, 0);
    if (total === 0) {
      ctx.fillStyle = '#555b73';
      ctx.font = '14px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Sem despesas este mes', W / 2, H / 2);
      return;
    }

    const centerX = useSideLegend ? W * 0.32 : W / 2;
    const centerY = useSideLegend ? H / 2 : 98;
    const radius = Math.min(useSideLegend ? 95 : 78, centerY - 15);
    const innerRadius = radius * 0.58;
    const gap = 0.02;

    let startAngle = -Math.PI / 2;

    data.forEach(d => {
      const sliceAngle = (d.amount / total) * Math.PI * 2;
      const adjustedStart = startAngle + gap;
      const adjustedEnd = startAngle + sliceAngle - gap;

      if (adjustedEnd > adjustedStart) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, adjustedStart, adjustedEnd);
        ctx.arc(centerX, centerY, innerRadius, adjustedEnd, adjustedStart, true);
        ctx.closePath();
        ctx.fillStyle = d.color;
        ctx.fill();
      }
      startAngle += sliceAngle;
    });

    // Centro
    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius - 1, 0, Math.PI * 2);
    ctx.fillStyle = '#181b26';
    ctx.fill();

    ctx.fillStyle = '#eef0f6';
    ctx.font = 'bold 15px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.formatCurrency(total), centerX, centerY - 2);
    ctx.fillStyle = '#555b73';
    ctx.font = '11px Inter, system-ui, sans-serif';
    ctx.fillText('Total', centerX, centerY + 14);

    // Legenda
    if (useSideLegend) {
      const legendX = W * 0.60;
      const legendW = W - legendX - 12;
      let legendY = 35;
      const legendItems = data.slice(0, maxVisibleLegendItems);
      const spacing = Math.min(36, (H - 70) / Math.max(legendItems.length, 1));

      legendItems.forEach(d => {
        if (legendY > H - 20) return;
        const pct = ((d.amount / total) * 100).toFixed(1);
        const category = this.truncateText(ctx, d.categoryName, Math.max(70, legendW - 22));

        ctx.fillStyle = d.color;
        ctx.beginPath();
        ctx.roundRect(legendX, legendY - 5, 10, 10, 2);
        ctx.fill();

        ctx.fillStyle = '#eef0f6';
        ctx.font = '13px Inter, system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(category, legendX + 16, legendY + 3);

        ctx.fillStyle = '#555b73';
        ctx.font = '11px Inter, system-ui, sans-serif';
        ctx.fillText(this.formatCurrency(d.amount) + ' (' + pct + '%)', legendX + 16, legendY + 18);

        legendY += spacing;
      });
    } else {
      const legendX = 18;
      let legendY = 205;
      const legendW = W - 36;
      const legendItems = data.slice(0, maxVisibleLegendItems);

      legendItems.forEach(d => {
        const pct = ((d.amount / total) * 100).toFixed(1);
        const valueText = this.formatCurrency(d.amount) + ' (' + pct + '%)';
        const categoryMaxW = Math.max(80, legendW - ctx.measureText(valueText).width - 34);

        ctx.fillStyle = d.color;
        ctx.beginPath();
        ctx.roundRect(legendX, legendY - 8, 10, 10, 2);
        ctx.fill();

        ctx.fillStyle = '#eef0f6';
        ctx.font = '12px Inter, system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(this.truncateText(ctx, d.categoryName, categoryMaxW), legendX + 16, legendY + 1);

        ctx.fillStyle = '#555b73';
        ctx.font = '11px Inter, system-ui, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(valueText, W - 18, legendY + 1);

        legendY += 24;
      });

      if (hiddenItems > 0) {
        ctx.fillStyle = '#555b73';
        ctx.font = '11px Inter, system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`+${hiddenItems} categorias`, legendX, legendY + 4);
      }
    }
  },

  redrawAll(summaryData) {
    this.lastSummaryData = summaryData;
    if (summaryData.monthlyData) {
      this.drawAreaChart('areaChart', summaryData.monthlyData);
    }
    if (summaryData.categoryBreakdown) {
      this.drawPieChart('pieChart', summaryData.categoryBreakdown);
    }
  },

  redrawFromCache() {
    if (this.lastSummaryData) {
      this.redrawAll(this.lastSummaryData);
    }
  }
};
