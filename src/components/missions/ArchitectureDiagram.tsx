"use client";

import type { DiagramComponent, DiagramConfig } from "@/lib/missions/types";
import { cn } from "@/lib/utils";
import { useCallback, useMemo, useState } from "react";

/**
 * Fisher-Yates shuffle algorithm for randomizing array
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Props for the ArchitectureDiagram component.
 */
export type ArchitectureDiagramProps = {
  config: DiagramConfig;
  onComplete: () => void;
  initialPlacements?: Record<string, string>; // zoneId -> componentId
};

/**
 * A drag-and-drop architecture diagram component.
 * Users place labeled components into drop zones to match the correct architecture.
 */
export function ArchitectureDiagram({
  config,
  onComplete,
  initialPlacements = {},
}: ArchitectureDiagramProps): React.ReactElement {
  // Shuffle components on mount for randomized order
  const shuffledComponents = useMemo(
    () => shuffleArray(config.components),
    [config.components]
  );

  const [placements, setPlacements] = useState<Record<string, string>>(initialPlacements);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [draggedComponent, setDraggedComponent] = useState<string | null>(null);
  const [dragSource, setDragSource] = useState<"pool" | string | null>(null); // 'pool' or zoneId
  const [completed, setCompleted] = useState(false);

  // Check if all placements are correct (does NOT navigate - just shows feedback)
  const checkPlacements = useCallback(() => {
    const allZonesFilled = config.dropZones.every((zone) => placements[zone.id]);
    
    if (!allZonesFilled) {
      setFeedback({ type: "error", message: "Place all components in the drop zones first" });
      return;
    }

    const allCorrect = config.correctPlacements.every((placement) => {
      return placements[placement.zoneId] === placement.componentId;
    });

    if (allCorrect) {
      setFeedback({ type: "success", message: "Correct! All components are in the right places." });
      setCompleted(true);
    } else {
      setFeedback({ type: "error", message: "Some placements are incorrect. Try again!" });
    }
  }, [config.correctPlacements, config.dropZones, placements]);

  // Handle continue to next stage (only called after correct answer)
  const handleContinue = useCallback(() => {
    if (completed) {
      onComplete();
    }
  }, [completed, onComplete]);

  // Handle drag start from component pool
  const handleDragStartFromPool = (componentId: string) => {
    setDraggedComponent(componentId);
    setDragSource("pool");
    setFeedback(null);
  };

  // Handle drag start from a zone (to move to another zone or back to pool)
  const handleDragStartFromZone = (componentId: string, zoneId: string) => {
    setDraggedComponent(componentId);
    setDragSource(zoneId);
    setFeedback(null);
  };

  // Handle drop on zone
  const handleDropOnZone = (zoneId: string) => {
    if (draggedComponent) {
      setPlacements((prev) => {
        const newPlacements = { ...prev };
        
        // If dragging from another zone, clear that zone first
        if (dragSource && dragSource !== "pool") {
          delete newPlacements[dragSource];
        }
        
        // If this zone already has a component, it gets replaced
        // (the old component goes back to pool automatically since it's no longer in placements)
        newPlacements[zoneId] = draggedComponent;
        
        return newPlacements;
      });
      setDraggedComponent(null);
      setDragSource(null);
    }
  };

  // Handle drop on the component pool area (to remove from zone)
  const handleDropOnPool = () => {
    if (draggedComponent && dragSource && dragSource !== "pool") {
      setPlacements((prev) => {
        const newPlacements = { ...prev };
        delete newPlacements[dragSource];
        return newPlacements;
      });
    }
    setDraggedComponent(null);
    setDragSource(null);
  };

  // Handle drag over (allow drop)
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Handle click on placed component to remove it
  const handleRemoveFromZone = (zoneId: string) => {
    if (completed) return; // Don't allow changes after completion
    setPlacements((prev) => {
      const newPlacements = { ...prev };
      delete newPlacements[zoneId];
      return newPlacements;
    });
    setFeedback(null);
  };

  // Get component by ID
  const getComponent = (componentId: string): DiagramComponent | undefined => {
    return config.components.find((c) => c.id === componentId);
  };

  // Check if component is placed somewhere
  const isComponentPlaced = (componentId: string): boolean => {
    return Object.values(placements).includes(componentId);
  };

  // Default instructions if not provided
  const instructions = config.instructions || 
    "Drag each component to its correct position in the architecture. Click a placed component to remove it.";

  return (
    <div
      data-testid="architecture-diagram"
      className={cn(
        "rounded-lg p-6",
        "bg-anime-900 border border-anime-700"
      )}
    >
      {/* Instructions */}
      {!completed && (
        <div className="mb-6 p-4 rounded-md bg-anime-800/50 border border-anime-700">
          <div className="flex items-start gap-3">
            <span className="text-anime-cyan text-xl">💡</span>
            <p className="text-anime-300 text-sm">{instructions}</p>
          </div>
        </div>
      )}

      {/* Available Components */}
      <div 
        className="mb-6"
        onDrop={handleDropOnPool}
        onDragOver={handleDragOver}
      >
        <h3 className="text-sm font-medium text-anime-400 mb-3">Components</h3>
        <div className={cn(
          "flex flex-wrap gap-3 min-h-[60px] p-3 rounded-lg border-2 border-dashed",
          dragSource && dragSource !== "pool" ? "border-anime-yellow bg-anime-yellow/5" : "border-transparent"
        )}>
          {shuffledComponents.map((component) => {
            const placed = isComponentPlaced(component.id);
            return (
              <div
                key={component.id}
                draggable={!placed && !completed}
                onDragStart={() => handleDragStartFromPool(component.id)}
                className={cn(
                  "px-4 py-2 rounded-md",
                  "bg-anime-800 border border-anime-600",
                  "flex items-center gap-2",
                  "transition-all duration-200",
                  placed && "opacity-40 cursor-not-allowed",
                  !placed && !completed && "cursor-grab hover:border-anime-cyan hover:shadow-neon-cyan"
                )}
              >
                <span className="text-anime-cyan">{component.icon}</span>
                <span className="text-anime-100">{component.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Drop Zones */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-anime-400 mb-3">Architecture Zones</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {config.dropZones.map((zone) => {
            const placedComponent = placements[zone.id] ? getComponent(placements[zone.id]) : null;
            
            return (
              <div
                key={zone.id}
                onDrop={() => handleDropOnZone(zone.id)}
                onDragOver={handleDragOver}
                className={cn(
                  "min-h-[100px] rounded-lg p-4",
                  "border-2 border-dashed",
                  "flex flex-col items-center justify-center",
                  "transition-all duration-200",
                  placedComponent
                    ? "border-anime-cyan bg-anime-800/50"
                    : "border-anime-700 bg-anime-950/50",
                  draggedComponent && "border-anime-purple bg-anime-purple/10"
                )}
              >
                <span className="text-sm text-anime-400 mb-2">{zone.label}</span>
                {placedComponent && (
                  <div 
                    draggable={!completed}
                    onDragStart={() => handleDragStartFromZone(placedComponent.id, zone.id)}
                    onClick={() => handleRemoveFromZone(zone.id)}
                    className={cn(
                      "px-3 py-1 bg-anime-800 border border-anime-cyan rounded text-anime-100",
                      !completed && "cursor-pointer hover:bg-anime-700 hover:border-anime-yellow",
                      "transition-all duration-200"
                    )}
                    title={!completed ? "Click to remove or drag to move" : undefined}
                  >
                    {placedComponent.label}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          className={cn(
            "mb-4 p-3 rounded-md text-center",
            feedback.type === "success" && "bg-anime-green/20 text-anime-green border border-anime-green",
            feedback.type === "error" && "bg-anime-accent/20 text-anime-accent border border-anime-accent"
          )}
        >
          {feedback.message}
        </div>
      )}

      {/* Learnings (shown after correct placement) */}
      {completed && config.learnings && config.learnings.length > 0 && (
        <div className="mb-6 p-4 rounded-lg bg-anime-cyan/10 border border-anime-cyan">
          <h3 className="font-heading text-lg text-anime-cyan mb-3">What You Learned</h3>
          <ul className="space-y-2">
            {config.learnings.map((learning, index) => (
              <li key={index} className="flex items-start gap-2 text-anime-300">
                <span className="text-anime-green mt-0.5">✓</span>
                <span>{learning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Check Button (hidden after completion) */}
      {!completed && (
        <div className="flex justify-center">
          <button
            onClick={checkPlacements}
            className={cn(
              "px-6 py-2 rounded-md font-medium",
              "bg-anime-cyan/20 text-anime-cyan border border-anime-cyan",
              "hover:bg-anime-cyan/30 hover:shadow-neon-cyan",
              "transition-all duration-200"
            )}
          >
            Check Placement
          </button>
        </div>
      )}

      {/* Continue Button (shown after correct answer) */}
      {completed && (
        <div className="flex justify-center">
          <button
            onClick={handleContinue}
            className={cn(
              "px-8 py-3 rounded-md font-heading text-sm uppercase tracking-wider font-bold",
              "bg-anime-green text-anime-950",
              "hover:shadow-neon-cyan hover:scale-105",
              "transition-all duration-200"
            )}
          >
            Continue to Next Stage →
          </button>
        </div>
      )}
    </div>
  );
}
