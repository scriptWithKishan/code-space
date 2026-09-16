import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProjectsService } from './projects.service.js';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { WorkspaceRole } from '../schemas/workspace.schema.js';
import { TaskPriority, TaskStatus } from '../schemas/task.schema.js';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let mockProjectModel: any;
  let mockTaskModel: any;
  let mockWorkspaceModel: any;
  let mockUserModel: any;
  let mockEventsGateway: any;

  const mockUserId = new Types.ObjectId().toString();
  const mockWorkspaceId = new Types.ObjectId().toString();

  beforeEach(() => {
    mockProjectModel = vi.fn();
    mockProjectModel.findOne = vi.fn();
    mockProjectModel.find = vi.fn();
    mockProjectModel.findById = vi.fn();
    mockProjectModel.findByIdAndDelete = vi.fn();

    mockTaskModel = vi.fn();
    mockTaskModel.find = vi.fn();
    mockTaskModel.deleteMany = vi.fn();

    mockWorkspaceModel = vi.fn();
    mockWorkspaceModel.findById = vi.fn();
    mockWorkspaceModel.find = vi.fn();

    mockUserModel = vi.fn();

    mockEventsGateway = {
      server: {
        to: vi.fn().mockReturnValue({
          emit: vi.fn(),
        }),
      },
    };

    service = new ProjectsService(
      mockProjectModel as any,
      mockTaskModel as any,
      mockWorkspaceModel as any,
      mockUserModel as any,
      mockEventsGateway as any,
    );
  });

  describe('checkWorkspaceAccess', () => {
    it('should throw NotFoundException if workspace does not exist', async () => {
      mockWorkspaceModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      });

      await expect(
        service.checkWorkspaceAccess(mockUserId, mockWorkspaceId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not a workspace member', async () => {
      mockWorkspaceModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue({
          _id: mockWorkspaceId,
          ownerId: new Types.ObjectId(),
          members: [],
        }),
      });

      await expect(
        service.checkWorkspaceAccess(mockUserId, mockWorkspaceId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if Admin role required but user is regular member', async () => {
      mockWorkspaceModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue({
          _id: mockWorkspaceId,
          ownerId: new Types.ObjectId(),
          members: [{ userId: new Types.ObjectId(mockUserId), role: WorkspaceRole.MEMBER }],
        }),
      });

      await expect(
        service.checkWorkspaceAccess(mockUserId, mockWorkspaceId, WorkspaceRole.ADMIN),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow access if user is workspace owner', async () => {
      const mockWs = {
        _id: mockWorkspaceId,
        ownerId: new Types.ObjectId(mockUserId),
        members: [],
      };
      mockWorkspaceModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockWs),
      });

      const res = await service.checkWorkspaceAccess(mockUserId, mockWorkspaceId, WorkspaceRole.ADMIN);
      expect(res).toEqual(mockWs);
    });
  });

  describe('getProjectStats', () => {
    it('should aggregate task status and priority breakdown correctly', async () => {
      const projectId = new Types.ObjectId().toString();
      const mockProject = {
        _id: new Types.ObjectId(projectId),
        name: 'Test Project',
        workspaceId: new Types.ObjectId(mockWorkspaceId),
        members: [new Types.ObjectId(mockUserId)],
      };

      vi.spyOn(service, 'getProjectById').mockResolvedValue(mockProject as any);

      const mockTasks = [
        { status: TaskStatus.TODO, priority: TaskPriority.HIGH },
        { status: TaskStatus.IN_PROGRESS, priority: TaskPriority.URGENT },
        { status: TaskStatus.DONE, priority: TaskPriority.MEDIUM },
        { status: TaskStatus.DONE, priority: TaskPriority.LOW },
      ];

      mockTaskModel.find.mockReturnValue({
        lean: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue(mockTasks),
        }),
      });

      const stats = await service.getProjectStats(mockUserId, projectId);

      expect(stats.totalTasks).toBe(4);
      expect(stats.completedTasks).toBe(2);
      expect(stats.completionPercentage).toBe(50);
      expect(stats.highUrgentTasksCount).toBe(2);
      expect(stats.teamCount).toBe(1);
      expect(stats.statusBreakdown.DONE).toBe(2);
      expect(stats.statusBreakdown.TODO).toBe(1);
      expect(stats.priorityBreakdown.HIGH).toBe(1);
      expect(stats.priorityBreakdown.URGENT).toBe(1);
    });
  });
});
