import React from 'react';
import './styles/loading-screen.css';

const LoadingScreen = ({ progress, statusMessage, projectName }) => {
  const normalizedProgress = Math.min(Math.max(progress, 0), 100);
  
  // Better fallback for project name with smooth updates
  const displayProjectName = projectName || 'Project';
  const title = `${displayProjectName} Manager`;
  
  // Default status messages based on progress
  const getDefaultStatus = () => {
    if (normalizedProgress < 10) return "Starting application...";
    if (normalizedProgress < 30) return "Loading components...";
    if (normalizedProgress < 50) return "Verifying environment...";
    if (normalizedProgress < 70) return "Checking tools and dependencies...";
    if (normalizedProgress < 85) return "Fetching cloud resources...";
    if (normalizedProgress < 95) return "Finalizing setup...";
    return "Almost ready...";
  };
  
  return (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="loading-logo">
          <div className="iso-cube">
            <div className="cube-face front"></div>
            <div className="cube-face back"></div>
            <div className="cube-face right"></div>
            <div className="cube-face left"></div>
            <div className="cube-face top"></div>
            <div className="cube-face bottom"></div>
          </div>
        </div>
        
        <h1 className="loading-title">{title}</h1>
        <div className="loading-subtitle">Initializing environment...</div>
        
        <div className="progress-container">
          <div 
            className="progress-bar" 
            style={{ width: `${normalizedProgress}%` }}
          ></div>
          <div className="progress-text">{normalizedProgress}%</div>
        </div>
        
        <div className="loading-status">
          {statusMessage || getDefaultStatus()}
        </div>

        <div className="loading-particles">
          {Array.from({ length: 15 }).map((_, index) => (
            <div key={index} className="particle"></div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen; 