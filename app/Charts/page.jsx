/*
'use client';
import React, { Suspense, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Chart } from 'react-chartjs-2';
import Navbar from "../components/Navbar";

export default function ChartsPage() {
  return (
    <Suspense fallback={<div className="loader">Loading Chart...</div>}>
      <ChartContent />
    </Suspense>
  );
}

function ChartContent() {
  const searchParams = useSearchParams();
  const symbol = searchParams.get('symbol');
  
  const [dualView, setDualView] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const chartRef = useRef(null);
  const drawingCanvasRef = useRef(null);

  return (
    <>
      <Navbar />
      <div className="charts-page">
        <button onClick={() => setDualView(!dualView)}>Toggle View</button>

        {dualView ? (
          <div className="dual-view-grid">
            <ChartContainer symbol={symbol} isDrawing={isDrawing} setIsDrawing={setIsDrawing} />
            <ChartContainer symbol={`${symbol}-secondary`} isDrawing={isDrawing} setIsDrawing={setIsDrawing} />
          </div>
        ) : (
          <ChartContainer symbol={symbol} isDrawing={isDrawing} setIsDrawing={setIsDrawing} />
        )}
      </div>
    </>
  );
}

function ChartContainer({ symbol, isDrawing, setIsDrawing }) {
  const chartRef = useRef(null);
  const drawingCanvasRef = useRef(null);

  const startDrawing = (e) => {
    if (!isDrawing) return;
    const ctx = drawingCanvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
  };

  const draw = (e) => {
    if (!isDrawing || e.buttons !== 1) return;
    const ctx = drawingCanvasRef.current.getContext('2d');
    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 2;
    ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    ctx.stroke();
  };

  return (
    <div className="chart-wrapper" style={{ position: 'relative', height: '400px' }}>
      <Chart ref={chartRef} type="line" data={} />
      
      {isDrawing && (
        <canvas
          ref={drawingCanvasRef}
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'auto', zIndex: 10 }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          width={800} height={400}
        />
      )}
      
      <button onClick={() => setIsDrawing(!isDrawing)}>
        <img src="/pencil.svg" alt="draw" />
      </button>
    </div>
  );
}
  */