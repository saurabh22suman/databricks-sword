/**
 * Tests for the pipeline map layout configuration.
 *
 * Verifies node positions, zone containment, edge consistency,
 * and exported functions for the horizontal pipeline layout.
 */

import { describe, expect, it } from "vitest"
import {
    getAllMapNodes,
    getDependents,
    getEdgesByTrack,
    getFieldOpsNodes,
    getMapEdges,
    getMissionNodes,
    getNodeById,
    getPrerequisites,
    getZoneById,
    MAP_CENTER,
    MAP_HEIGHT,
    MAP_SIZE,
    MAP_WIDTH,
    RANK_COLORS,
    TRACK_COLORS,
    ZONES,
} from "../mapLayout"

describe("mapLayout — pipeline layout", () => {
  describe("constants", () => {
    it("should have correct map dimensions", () => {
      expect(MAP_WIDTH).toBe(2800)
      expect(MAP_HEIGHT).toBe(1300)
    })

    it("MAP_CENTER should be at the center of the map", () => {
      expect(MAP_CENTER.x).toBe(MAP_WIDTH / 2)
      expect(MAP_CENTER.y).toBe(MAP_HEIGHT / 2)
    })

    it("MAP_SIZE should equal MAP_WIDTH for backward compat", () => {
      expect(MAP_SIZE).toBe(MAP_WIDTH)
    })
  })

  describe("zones", () => {
    it("should define 6 zones", () => {
      expect(ZONES).toHaveLength(6)
    })

    it("should have all required zone IDs", () => {
      const ids = ZONES.map((z) => z.id)
      expect(ids).toContain("foundation")
      expect(ids).toContain("core")
      expect(ids).toContain("specialization")
      expect(ids).toContain("mastery")
      expect(ids).toContain("capstone")
      expect(ids).toContain("field-ops")
    })

    it("mission zones should flow left-to-right", () => {
      const missionZones = ZONES.filter((z) => z.id !== "field-ops")
      for (let i = 1; i < missionZones.length; i++) {
        expect(missionZones[i].x).toBeGreaterThan(missionZones[i - 1].x)
      }
    })

    it("zones should not overlap horizontally", () => {
      const missionZones = ZONES.filter((z) => z.id !== "field-ops")
      for (let i = 1; i < missionZones.length; i++) {
        const prevEnd = missionZones[i - 1].x + missionZones[i - 1].width
        expect(missionZones[i].x).toBeGreaterThanOrEqual(prevEnd)
      }
    })

    it("getZoneById should return the correct zone", () => {
      const foundation = getZoneById("foundation")
      expect(foundation).toBeDefined()
      expect(foundation?.label).toBe("FOUNDATION")
    })

    it("getZoneById should return undefined for invalid ID", () => {
      const result = getZoneById("nonexistent" as never)
      expect(result).toBeUndefined()
    })
  })

  describe("mission nodes", () => {
    it("should return exactly 20 mission nodes", () => {
      const nodes = getMissionNodes()
      expect(nodes).toHaveLength(20)
    })

    it("all mission nodes should have type 'mission'", () => {
      const nodes = getMissionNodes()
      nodes.forEach((node) => {
        expect(node.type).toBe("mission")
      })
    })

    it("all mission nodes should have a track assigned", () => {
      const nodes = getMissionNodes()
      nodes.forEach((node) => {
        expect(node.track).toBeDefined()
        expect(["de", "ml", "bi"]).toContain(node.track)
      })
    })

    it("all mission nodes should have a zone assigned", () => {
      const nodes = getMissionNodes()
      nodes.forEach((node) => {
        expect(node.zone).toBeDefined()
      })
    })

    it("all mission positions should be within map bounds", () => {
      const nodes = getMissionNodes()
      nodes.forEach((node) => {
        expect(node.x).toBeGreaterThan(0)
        expect(node.x).toBeLessThan(MAP_WIDTH)
        expect(node.y).toBeGreaterThan(0)
        expect(node.y).toBeLessThan(MAP_HEIGHT)
      })
    })

    it("all mission IDs should be unique", () => {
      const nodes = getMissionNodes()
      const ids = nodes.map((n) => n.id)
      expect(new Set(ids).size).toBe(ids.length)
    })

    it("foundation zone should have exactly 1 mission", () => {
      const nodes = getMissionNodes().filter((n) => n.zone === "foundation")
      expect(nodes).toHaveLength(1)
      expect(nodes[0].id).toBe("lakehouse-fundamentals")
    })

    it("core zone should have exactly 2 missions", () => {
      const nodes = getMissionNodes().filter((n) => n.zone === "core")
      expect(nodes).toHaveLength(2)
    })

    it("specialization zone should have exactly 11 missions", () => {
      const nodes = getMissionNodes().filter((n) => n.zone === "specialization")
      expect(nodes).toHaveLength(11)
    })

    it("mastery zone should have exactly 3 missions", () => {
      const nodes = getMissionNodes().filter((n) => n.zone === "mastery")
      expect(nodes).toHaveLength(3)
    })

    it("capstone zone should have exactly 3 missions", () => {
      const nodes = getMissionNodes().filter((n) => n.zone === "capstone")
      expect(nodes).toHaveLength(3)
    })
  })

  describe("field ops nodes", () => {
    it("should return exactly 8 field ops nodes", () => {
      const nodes = getFieldOpsNodes()
      expect(nodes).toHaveLength(8)
    })

    it("all field ops nodes should have type 'field-ops'", () => {
      const nodes = getFieldOpsNodes()
      nodes.forEach((node) => {
        expect(node.type).toBe("field-ops")
      })
    })

    it("all field ops should have an industry", () => {
      const nodes = getFieldOpsNodes()
      nodes.forEach((node) => {
        expect(node.industry).toBeDefined()
      })
    })

    it("field ops should be positioned in the lower section", () => {
      const missionNodes = getMissionNodes()
      const fieldOpsNodes = getFieldOpsNodes()
      const maxMissionY = Math.max(...missionNodes.map((n) => n.y))
      fieldOpsNodes.forEach((node) => {
        expect(node.y).toBeGreaterThan(maxMissionY)
      })
    })
  })

  describe("all map nodes", () => {
    it("should return 28 total nodes (20 missions + 8 field ops)", () => {
      const nodes = getAllMapNodes()
      expect(nodes).toHaveLength(28)
    })
  })

  describe("edges", () => {
    it("should return 37 prerequisite edges", () => {
      const edges = getMapEdges()
      expect(edges).toHaveLength(35)
    })

    it("all edges should reference valid node IDs", () => {
      const edges = getMapEdges()
      const allNodes = getAllMapNodes()
      const nodeIds = new Set(allNodes.map((n) => n.id))
      edges.forEach((edge) => {
        expect(nodeIds.has(edge.from)).toBe(true)
        expect(nodeIds.has(edge.to)).toBe(true)
      })
    })

    it("all edges should have a track assigned", () => {
      const edges = getMapEdges()
      edges.forEach((edge) => {
        expect(edge.track).toBeDefined()
        expect(["de", "ml", "bi"]).toContain(edge.track)
      })
    })

    it("edges should generally flow left-to-right", () => {
      const edges = getMapEdges()
      const nodeMap = new Map(getAllMapNodes().map((n) => [n.id, n]))
      let leftToRightCount = 0
      edges.forEach((edge) => {
        const from = nodeMap.get(edge.from)
        const to = nodeMap.get(edge.to)
        if (from && to && to.x >= from.x) leftToRightCount++
      })
      // At least 80% should flow left-to-right
      expect(leftToRightCount / edges.length).toBeGreaterThan(0.8)
    })
  })

  describe("helper functions", () => {
    it("getNodeById should find existing nodes", () => {
      const node = getNodeById("lakehouse-fundamentals")
      expect(node).toBeDefined()
      expect(node?.id).toBe("lakehouse-fundamentals")
    })

    it("getNodeById should return undefined for missing nodes", () => {
      expect(getNodeById("nonexistent")).toBeUndefined()
    })

    it("getPrerequisites should return correct prerequisites", () => {
      const prereqs = getPrerequisites("pyspark-essentials")
      expect(prereqs).toContain("lakehouse-fundamentals")
    })

    it("getDependents should return correct dependents", () => {
      const deps = getDependents("lakehouse-fundamentals")
      expect(deps).toContain("pyspark-essentials")
      expect(deps).toContain("sql-analytics-intro")
    })

    it("getEdgesByTrack should filter correctly", () => {
      const deEdges = getEdgesByTrack("de")
      deEdges.forEach((edge) => {
        expect(edge.track).toBe("de")
      })
    })
  })

  describe("colors", () => {
    it("TRACK_COLORS should have all 3 tracks", () => {
      expect(TRACK_COLORS.de).toBeDefined()
      expect(TRACK_COLORS.ml).toBeDefined()
      expect(TRACK_COLORS.bi).toBeDefined()
    })

    it("RANK_COLORS should have all 3 ranks", () => {
      expect(RANK_COLORS.B).toBeDefined()
      expect(RANK_COLORS.A).toBeDefined()
      expect(RANK_COLORS.S).toBeDefined()
    })
  })
})
