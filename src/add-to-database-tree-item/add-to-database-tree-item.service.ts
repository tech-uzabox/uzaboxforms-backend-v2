import { Injectable } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { CreateAddToDatabaseTreeItemDto } from './dto/create-add-to-database-tree-item.dto';
import { UpdateAddToDatabaseTreeItemDto } from './dto/update-add-to-database-tree-item.dto';

@Injectable()
export class AddToDatabaseTreeItemService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateAddToDatabaseTreeItemDto): Promise<{ success: boolean; message: string; data: any }> {
    const { name, status, parentId, addToDatabaseId } = data;
    try {
      const result = await this.prisma.addToDatabaseTreeItem.create({
        data: {
          name,
          status,
          parentId: parentId || null,
          addToDatabaseId,
        },
        include: {
          children: true,
          parent: true,
          addToDatabase: true,
        },
      });
      return {
        success: true,
        message: 'Tree item created successfully',
        data: result
      };
    } catch (error) {
      console.error('Error creating tree item:', error);
      return {
        success: false,
        message: 'Failed to create tree item',
        data: null
      };
    }
  }

  async findAll(): Promise<{ success: boolean; message: string; data: any }> {
    try {
      const result = await this.prisma.addToDatabaseTreeItem.findMany({
        include: {
          children: true,
          parent: true,
          addToDatabase: true,
        },
      });
      return {
        success: true,
        message: 'Tree items retrieved successfully',
        data: result
      };
    } catch (error) {
      console.error('Error fetching tree items:', error);
      return {
        success: false,
        message: 'Failed to fetch tree items',
        data: null
      };
    }
  }

  async findByAddToDatabaseId(addToDatabaseId: string): Promise<{ success: boolean; message: string; data: any }> {
    try {
      const result = await this.prisma.addToDatabaseTreeItem.findMany({
        where: { addToDatabaseId },
        include: {
          children: true,
          parent: true,
          addToDatabase: true,
        },
      });
      return {
        success: true,
        message: 'Tree items retrieved successfully',
        data: result
      };
    } catch (error) {
      console.error('Error fetching tree items:', error);
      return {
        success: false,
        message: 'Failed to fetch tree items',
        data: null
      };
    }
  }

  async findRootNodes(addToDatabaseId: string): Promise<{ success: boolean; message: string; data: any }> {
    try {
      const result = await this.prisma.addToDatabaseTreeItem.findMany({
        where: { 
          parentId: null,
          addToDatabaseId 
        },
        include: {
          children: true,
          addToDatabase: true,
        },
      });
      return {
        success: true,
        message: 'Root nodes retrieved successfully',
        data: result
      };
    } catch (error) {
      console.error('Error fetching root nodes:', error);
      return {
        success: false,
        message: 'Failed to fetch root nodes',
        data: null
      };
    }
  }

  async getFullHierarchy(addToDatabaseId: string): Promise<{ success: boolean; message: string; data: any }> {
    try {
      const rootNodesResult = await this.findRootNodes(addToDatabaseId);
      if (!rootNodesResult.success) {
        return rootNodesResult;
      }
      const hierarchy = await Promise.all(rootNodesResult.data.map(node => this.buildTree(node)));
      return {
        success: true,
        message: 'Full hierarchy retrieved successfully',
        data: hierarchy
      };
    } catch (error) {
      console.error('Error fetching full hierarchy:', error);
      return {
        success: false,
        message: 'Failed to fetch full hierarchy',
        data: null
      };
    }
  }

  private async buildTree(node: any): Promise<any> {
    const children = await this.prisma.addToDatabaseTreeItem.findMany({
      where: { parentId: node.id },
      include: {
        children: true,
      },
    });
    const childrenWithSubTrees = await Promise.all(
      children.map(child => this.buildTree(child))
    );
    return {
      ...node,
      children: childrenWithSubTrees,
    };
  }

  async findOne(id: string): Promise<{ success: boolean; message: string; data: any }> {
    try {
      const result = await this.prisma.addToDatabaseTreeItem.findUnique({
        where: { id },
        include: {
          children: true,
          parent: true,
          addToDatabase: true,
        },
      });
      if (!result) {
        return {
          success: false,
          message: 'Tree item not found',
          data: null
        };
      }
      return {
        success: true,
        message: 'Tree item retrieved successfully',
        data: result
      };
    } catch (error) {
      console.error('Error fetching tree item:', error);
      return {
        success: false,
        message: 'Failed to fetch tree item',
        data: null
      };
    }
  }

  async update(
    id: string,
    data: UpdateAddToDatabaseTreeItemDto,
  ): Promise<{ success: boolean; message: string; data: any }> {
    try {
      const existing = await this.findOne(id);
      if (!existing.success) {
        return existing;
      }
      const result = await this.prisma.addToDatabaseTreeItem.update({
        where: { id },
        data,
        include: {
          children: true,
          parent: true,
          addToDatabase: true,
        },
      });
      return {
        success: true,
        message: 'Tree item updated successfully',
        data: result
      };
    } catch (error) {
      console.error('Error updating tree item:', error);
      return {
        success: false,
        message: 'Failed to update tree item',
        data: null
      };
    }
  }

  async remove(id: string): Promise<{ success: boolean; message: string; data: any }> {
    try {
      const existing = await this.findOne(id);
      if (!existing.success) {
        return existing;
      }
      const children = await this.prisma.addToDatabaseTreeItem.findMany({
        where: { parentId: id },
      });
      if (children.length > 0) {
        return {
          success: false,
          message: 'Cannot delete node with children. Please delete children first.',
          data: null
        };
      }
      const result = await this.prisma.addToDatabaseTreeItem.delete({ where: { id } });
      return {
        success: true,
        message: 'Tree item deleted successfully',
        data: result
      };
    } catch (error) {
      console.error('Error deleting tree item:', error);
      return {
        success: false,
        message: 'Failed to delete tree item',
        data: null
      };
    }
  }

  async getChildren(parentId: string): Promise<{ success: boolean; message: string; data: any }> {
    try {
      const result = await this.prisma.addToDatabaseTreeItem.findMany({
        where: { parentId },
        include: {
          children: true,
          parent: true,
          addToDatabase: true,
        },
      });
      return {
        success: true,
        message: 'Children retrieved successfully',
        data: result
      };
    } catch (error) {
      console.error('Error fetching children:', error);
      return {
        success: false,
        message: 'Failed to fetch children',
        data: null
      };
    }
  }
}
