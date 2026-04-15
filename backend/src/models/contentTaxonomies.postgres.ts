import { Prisma } from '@prisma/client';

import type { TaxonomyDocument, TaxonomyType } from '../content/types.js';
import { prisma } from '../services/postgres/prisma.js';
import { slugify } from '../utils/slugify.js';

function baseTaxonomy(type: TaxonomyType, record: {
  id: string;
  name: string;
  slug: string;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}): TaxonomyDocument {
  return {
    id: record.id,
    name: record.name,
    slug: record.slug,
    priority: record.priority,
    type,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export class ContentTaxonomyModelPostgres {
  static async list(type: TaxonomyType, limit = 100): Promise<TaxonomyDocument[]> {
    if (type === 'states') {
      const rows = await prisma.state.findMany({
        take: limit,
        orderBy: [{ priority: 'desc' }, { name: 'asc' }],
      });
      return rows.map((row) => ({
        ...baseTaxonomy(type, row),
        description: undefined,
        officialWebsite: undefined,
        shortName: undefined,
      }));
    }

    if (type === 'organizations') {
      const rows = await prisma.organization.findMany({
        take: limit,
        orderBy: [{ priority: 'desc' }, { name: 'asc' }],
      });
      return rows.map((row) => ({
        ...baseTaxonomy(type, row),
        description: row.description || undefined,
        officialWebsite: row.officialWebsite || undefined,
        shortName: row.shortName || undefined,
      }));
    }

    if (type === 'categories') {
      const rows = await prisma.category.findMany({
        take: limit,
        orderBy: [{ priority: 'desc' }, { name: 'asc' }],
      });
      return rows.map((row) => ({
        ...baseTaxonomy(type, row),
        description: row.description || undefined,
      }));
    }

    if (type === 'institutions') {
      const rows = await prisma.college.findMany({
        take: limit,
        orderBy: [{ priority: 'desc' }, { name: 'asc' }],
      });
      return rows.map((row) => ({
        ...baseTaxonomy(type, row),
        description: row.description || undefined,
        officialWebsite: row.officialWebsite || undefined,
        shortName: row.shortName || undefined,
      }));
    }

    if (type === 'exams') {
      const rows = await prisma.exam.findMany({
        take: limit,
        orderBy: [{ priority: 'desc' }, { name: 'asc' }],
      });
      return rows.map((row) => ({
        ...baseTaxonomy(type, row),
        description: row.description || undefined,
      }));
    }

    const rows = await prisma.qualification.findMany({
      take: limit,
      orderBy: [{ priority: 'desc' }, { name: 'asc' }],
    });
    return rows.map((row) => ({
      ...baseTaxonomy(type, row),
      description: row.description || undefined,
    }));
  }

  static async findBySlug(type: TaxonomyType, slug: string): Promise<TaxonomyDocument | null> {
    if (type === 'states') {
      const row = await prisma.state.findUnique({ where: { slug } });
      return row ? {
        ...baseTaxonomy(type, row),
        description: undefined,
        officialWebsite: undefined,
        shortName: undefined,
      } : null;
    }

    if (type === 'organizations') {
      const row = await prisma.organization.findUnique({ where: { slug } });
      return row ? {
        ...baseTaxonomy(type, row),
        description: row.description || undefined,
        officialWebsite: row.officialWebsite || undefined,
        shortName: row.shortName || undefined,
      } : null;
    }

    if (type === 'categories') {
      const row = await prisma.category.findUnique({ where: { slug } });
      return row ? {
        ...baseTaxonomy(type, row),
        description: row.description || undefined,
      } : null;
    }

    if (type === 'institutions') {
      const row = await prisma.college.findUnique({ where: { slug } });
      return row ? {
        ...baseTaxonomy(type, row),
        description: row.description || undefined,
        officialWebsite: row.officialWebsite || undefined,
        shortName: row.shortName || undefined,
      } : null;
    }

    if (type === 'exams') {
      const row = await prisma.exam.findUnique({ where: { slug } });
      return row ? {
        ...baseTaxonomy(type, row),
        description: row.description || undefined,
      } : null;
    }

    const row = await prisma.qualification.findUnique({ where: { slug } });
    return row ? {
      ...baseTaxonomy(type, row),
      description: row.description || undefined,
    } : null;
  }

  static async findById(type: TaxonomyType, id: string): Promise<TaxonomyDocument | null> {
    if (type === 'states') {
      const row = await prisma.state.findUnique({ where: { id } });
      return row ? {
        ...baseTaxonomy(type, row),
        description: undefined,
        officialWebsite: undefined,
        shortName: undefined,
      } : null;
    }

    if (type === 'organizations') {
      const row = await prisma.organization.findUnique({ where: { id } });
      return row ? {
        ...baseTaxonomy(type, row),
        description: row.description || undefined,
        officialWebsite: row.officialWebsite || undefined,
        shortName: row.shortName || undefined,
      } : null;
    }

    if (type === 'categories') {
      const row = await prisma.category.findUnique({ where: { id } });
      return row ? {
        ...baseTaxonomy(type, row),
        description: row.description || undefined,
      } : null;
    }

    if (type === 'institutions') {
      const row = await prisma.college.findUnique({ where: { id } });
      return row ? {
        ...baseTaxonomy(type, row),
        description: row.description || undefined,
        officialWebsite: row.officialWebsite || undefined,
        shortName: row.shortName || undefined,
      } : null;
    }

    if (type === 'exams') {
      const row = await prisma.exam.findUnique({ where: { id } });
      return row ? {
        ...baseTaxonomy(type, row),
        description: row.description || undefined,
      } : null;
    }

    const row = await prisma.qualification.findUnique({ where: { id } });
    return row ? {
      ...baseTaxonomy(type, row),
      description: row.description || undefined,
    } : null;
  }

  static async create(type: TaxonomyType, input: Omit<TaxonomyDocument, 'id' | 'type' | 'createdAt' | 'updatedAt'>) {
    const name = input.name.trim();
    const slug = slugify(input.slug || name);
    const priority = input.priority ?? 0;

    try {
      if (type === 'states') {
        const created = await prisma.state.create({
          data: {
            name,
            slug,
            priority,
          },
        });
        return {
          ...baseTaxonomy(type, created),
          description: undefined,
          officialWebsite: undefined,
          shortName: undefined,
        };
      }

      if (type === 'organizations') {
        const created = await prisma.organization.create({
          data: {
            name,
            slug,
            priority,
            description: input.description?.trim() || null,
            officialWebsite: input.officialWebsite?.trim() || null,
            shortName: input.shortName?.trim() || null,
          },
        });
        return {
          ...baseTaxonomy(type, created),
          description: created.description || undefined,
          officialWebsite: created.officialWebsite || undefined,
          shortName: created.shortName || undefined,
        };
      }

      if (type === 'categories') {
        const created = await prisma.category.create({
          data: {
            name,
            slug,
            priority,
            description: input.description?.trim() || null,
          },
        });
        return {
          ...baseTaxonomy(type, created),
          description: created.description || undefined,
        };
      }

      if (type === 'institutions') {
        const created = await prisma.college.create({
          data: {
            name,
            slug,
            priority,
            description: input.description?.trim() || null,
            officialWebsite: input.officialWebsite?.trim() || null,
            shortName: input.shortName?.trim() || null,
          },
        });
        return {
          ...baseTaxonomy(type, created),
          description: created.description || undefined,
          officialWebsite: created.officialWebsite || undefined,
          shortName: created.shortName || undefined,
        };
      }

      if (type === 'exams') {
        const created = await prisma.exam.create({
          data: {
            name,
            slug,
            priority,
            description: input.description?.trim() || null,
          },
        });
        return {
          ...baseTaxonomy(type, created),
          description: created.description || undefined,
        };
      }

      const created = await prisma.qualification.create({
        data: {
          name,
          slug,
          priority,
          description: input.description?.trim() || null,
        },
      });
      return {
        ...baseTaxonomy(type, created),
        description: created.description || undefined,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new Error(`A ${type.slice(0, -1)} with slug "${slug}" already exists`);
      }
      throw error;
    }
  }

  static async update(type: TaxonomyType, id: string, input: Omit<TaxonomyDocument, 'id' | 'type' | 'createdAt' | 'updatedAt'>) {
    const existing = await this.findById(type, id);
    if (!existing) return null;

    const name = input.name.trim();
    const slug = slugify(input.slug || name);
    const priority = input.priority ?? 0;

    try {
      if (type === 'states') {
        const updated = await prisma.state.update({
          where: { id },
          data: {
            name,
            slug,
            priority,
          },
        });
        return {
          ...baseTaxonomy(type, updated),
          description: undefined,
          officialWebsite: undefined,
          shortName: undefined,
        };
      }

      if (type === 'organizations') {
        const updated = await prisma.organization.update({
          where: { id },
          data: {
            name,
            slug,
            priority,
            description: input.description?.trim() || null,
            officialWebsite: input.officialWebsite?.trim() || null,
            shortName: input.shortName?.trim() || null,
          },
        });
        return {
          ...baseTaxonomy(type, updated),
          description: updated.description || undefined,
          officialWebsite: updated.officialWebsite || undefined,
          shortName: updated.shortName || undefined,
        };
      }

      if (type === 'categories') {
        const updated = await prisma.category.update({
          where: { id },
          data: {
            name,
            slug,
            priority,
            description: input.description?.trim() || null,
          },
        });
        return {
          ...baseTaxonomy(type, updated),
          description: updated.description || undefined,
        };
      }

      if (type === 'institutions') {
        const updated = await prisma.college.update({
          where: { id },
          data: {
            name,
            slug,
            priority,
            description: input.description?.trim() || null,
            officialWebsite: input.officialWebsite?.trim() || null,
            shortName: input.shortName?.trim() || null,
          },
        });
        return {
          ...baseTaxonomy(type, updated),
          description: updated.description || undefined,
          officialWebsite: updated.officialWebsite || undefined,
          shortName: updated.shortName || undefined,
        };
      }

      if (type === 'exams') {
        const updated = await prisma.exam.update({
          where: { id },
          data: {
            name,
            slug,
            priority,
            description: input.description?.trim() || null,
          },
        });
        return {
          ...baseTaxonomy(type, updated),
          description: updated.description || undefined,
        };
      }

      const updated = await prisma.qualification.update({
        where: { id },
        data: {
          name,
          slug,
          priority,
          description: input.description?.trim() || null,
        },
      });
      return {
        ...baseTaxonomy(type, updated),
        description: updated.description || undefined,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new Error(`A ${type.slice(0, -1)} with slug "${slug}" already exists`);
      }
      throw error;
    }
  }

  static async remove(type: TaxonomyType, id: string) {
    try {
      if (type === 'states') {
        await prisma.state.delete({ where: { id } });
        return true;
      }

      if (type === 'organizations') {
        await prisma.organization.delete({ where: { id } });
        return true;
      }

      if (type === 'categories') {
        await prisma.category.delete({ where: { id } });
        return true;
      }

      if (type === 'institutions') {
        await prisma.college.delete({ where: { id } });
        return true;
      }

      if (type === 'exams') {
        await prisma.exam.delete({ where: { id } });
        return true;
      }

      await prisma.qualification.delete({ where: { id } });
      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return false;
      }
      throw error;
    }
  }
}

export default ContentTaxonomyModelPostgres;
