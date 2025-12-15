import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Play, Pause, StopCircle, Clock } from 'lucide-react';

const Timer = ({ onStop }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const startTimeRef = useRef(null);
  const pausedTimeRef = useRef(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (isRunning && !isPaused) {
      intervalRef.current = setInterval(() => {
        setElapsedTime(Date.now() - startTimeRef.current - pausedTimeRef.current);
      }, 100);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [isRunning, isPaused]);

  const formatTime = (milliseconds) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const handleStart = () => {
    if (!isRunning) {
      startTimeRef.current = Date.now();
      pausedTimeRef.current = 0;
      setIsRunning(true);
      setIsPaused(false);
      setElapsedTime(0);
    }
  };

  const handlePause = () => {
    if (isRunning && !isPaused) {
      setIsPaused(true);
      pausedTimeRef.current = pausedTimeRef.current + (Date.now() - startTimeRef.current - elapsedTime);
    }
  };

  const handleResume = () => {
    if (isRunning && isPaused) {
      setIsPaused(false);
    }
  };

  const handleStop = () => {
    if (isRunning) {
      const hours = elapsedTime / (1000 * 60 * 60);
      clearInterval(intervalRef.current);
      setIsRunning(false);
      setIsPaused(false);
      setElapsedTime(0);
      pausedTimeRef.current = 0;
      startTimeRef.current = null;
      
      if (onStop) {
        onStop(hours);
      }
    }
  };

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-slate-600">Timer de Trabajo</p>
              <p className="text-2xl font-bold font-mono text-blue-600">{formatTime(elapsedTime)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isRunning && (
              <Button
                onClick={handleStart}
                className="bg-green-600 hover:bg-green-700"
                size="sm"
              >
                <Play className="w-4 h-4 mr-1" />
                Iniciar
              </Button>
            )}

            {isRunning && !isPaused && (
              <Button
                onClick={handlePause}
                variant="outline"
                size="sm"
                className="border-orange-300 text-orange-600 hover:bg-orange-50"
              >
                <Pause className="w-4 h-4 mr-1" />
                Pausar
              </Button>
            )}

            {isRunning && isPaused && (
              <Button
                onClick={handleResume}
                className="bg-blue-600 hover:bg-blue-700"
                size="sm"
              >
                <Play className="w-4 h-4 mr-1" />
                Reanudar
              </Button>
            )}

            {isRunning && (
              <Button
                onClick={handleStop}
                variant="outline"
                size="sm"
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                <StopCircle className="w-4 h-4 mr-1" />
                Detener y Guardar
              </Button>
            )}
          </div>
        </div>

        {isRunning && (
          <div className="mt-3 pt-3 border-t border-blue-200">
            <p className="text-xs text-slate-600">
              {isPaused ? '⏸️ Timer en pausa' : '⏱️ Timer en ejecución'} - Las horas se guardarán automáticamente al detener
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Timer;
