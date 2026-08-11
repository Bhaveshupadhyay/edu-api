import dbConnectionPromise from "../config/db.js";
import logger from "../libs/logger.js";
import {
  IDENTIFIER
} from "../config/env.js";
import { Vimeo } from '@vimeo/vimeo';
import {
  handleValidationErrors,
  createError
} from "../utils/validationHelper.js";
import {
  asyncHandler,
  sendSuccess,
  getCursorPaginationParams,
  sendCursorPaginatedResponse
} from '../utils/paginationHelper.js';

import { getOrSetCache } from "../utils/cache.js";
import { isReviewer } from "../utils/authHelper.js";

const vimeoClient = new Vimeo(null, null, IDENTIFIER);

// ... (fetchVimeoVideoData omitted for brevity in the tool call, but I will provide the full block in the replace)

const fetchVimeoVideoData = async (videoId) => {
  return new Promise((resolve, reject) => {
    vimeoClient.request({
      method: 'GET',
      path: `/videos/${videoId}`,
      query: {
        fields: 'files,duration,pictures'
      }
    }, function (error, body) {
      if (error) {
        logger.error('Error fetching video data from Vimeo:', error);
        return resolve({
          isSuccess: true,
          data: { id: videoId, files: [], duration: "", thumbnail: "" }
        });
      }

      if (!body.files || body.files.length === 0) {
        return resolve({
          isSuccess: true,
          data: { id: videoId, files: [], duration: "", thumbnail: "" }
        });
      }

      const videoFiles = body.files.map(file => ({
        quality: file.rendition === "adaptive" ? 'hls' : file.rendition?.replace('p', ''),
        link: file.link
      }));

      resolve({
        isSuccess: true,
        data: {
          id: videoId,
          files: videoFiles,
          duration: body?.duration,
          thumbnail: body?.pictures?.base_link
        }
      });
    });
  });
};

export const get_search_data = asyncHandler(async (req, res) => {
  handleValidationErrors(req);

  const { limit, cursor } = getCursorPaginationParams(req.query);
  const term = req.query.term || "";

  const db = await dbConnectionPromise;

  const cacheKey = `cache:/api/v1/users/search:term=${term}:limit=${limit}:cursor=${cursor || 'start'}`;

  const result = await getOrSetCache(cacheKey, async () => {
    let whereConditions = ["m.is_active = 1"];
    let queryParams = [];

    if (term) {
      whereConditions.push("(m.title LIKE ? OR m.description LIKE ?)");
      queryParams.push(`%${term}%`, `%${term}%`);
    }

    if (cursor) {
      whereConditions.push("m.id < ?");
      queryParams.push(cursor);
    }

    const whereClause = `WHERE ${whereConditions.join(" AND ")}`;

    const dataQuery = `
      SELECT m.id, m.title, m.description, m.thumbnail_url, m.is_free,
             (SELECT GROUP_CONCAT(c.name SEPARATOR ', ') FROM module_category_mapping mcm JOIN categories c ON mcm.category_id = c.id WHERE mcm.module_id = m.id) AS categories
      FROM modules AS m
      ${whereClause}
      ORDER BY m.id DESC
      LIMIT ?
    `;

    queryParams.push(limit + 1);

    const [modules] = await db.query(dataQuery, queryParams);

    if (modules.length === 0) {
      return { data: [], nextCursor: null, hasMore: false };
    }

    const hasMore = modules.length > limit;
    const data = hasMore ? modules.slice(0, limit) : modules;
    const nextCursor = hasMore ? data[data.length - 1].id : null;

    return { data, nextCursor, hasMore };
  });

  return sendCursorPaginatedResponse(res, result.data, { nextCursor: result.nextCursor, hasMore: result.hasMore });
});

export const get_home_data = asyncHandler(async (req, res) => {
  handleValidationErrors(req);
  const { limit, cursor } = getCursorPaginationParams(req.query);
  const db = await dbConnectionPromise;

  const cacheKey = `cache:/api/v1/users/home:limit=${limit}:cursor=${cursor || 'start'}`;

  const result = await getOrSetCache(cacheKey, async () => {
    // 1. Fetch Nav Pills & Filters (Parallel)
    const [navPills, filterRows] = await Promise.all([
      db.query(`SELECT np.id, np.name, np.active_color, np.ui_style 
                FROM home_page_config hpc 
                JOIN nav_pills np ON hpc.nav_pill_id = np.id 
                WHERE hpc.is_visible = true ORDER BY hpc.position ASC`),
      db.query(`SELECT cg.id as group_id, cg.group_name, c.id as cat_id, c.name as cat_name 
                FROM category_groups cg 
                LEFT JOIN categories c ON cg.id = c.group_id ORDER BY cg.id ASC`)
    ]);

    // 2. Transform Filters
    const filter_array = filterRows[0].reduce((acc, row) => {
      if (!row.group_id) return acc;
      let group = acc.find(g => g.id === row.group_id);
      if (!group) {
        group = { id: row.group_id, name: row.group_name, categories: [] };
        acc.push(group);
      }
      if (row.cat_id) group.categories.push({ id: row.cat_id, name: row.cat_name });
      return acc;
    }, []);

    // 3. OPTIMIZATION: Fetch Initial Content for the FIRST Nav Pill (Paginated)
    let initial_data = null;
    if (navPills[0].length > 0) {
      const firstPillId = navPills[0][0].id;
      const { sections, nextCursor, hasMore } = await fetch_pill_collections_optimized(firstPillId, db, limit, cursor);
      initial_data = {
        nav_pill_id: parseInt(firstPillId),
        sections,
        nextCursor,
        hasMore
      };
    }

    return { 
      navigation_pills: navPills[0], 
      filter_array,
      initial_data 
    };
  });

  return sendSuccess(res, result);
});

// Internal helper to avoid code duplication with cursor support
const fetch_pill_collections_optimized = async (nav_pill_id, db, limit = 5, cursor = null, moduleLimit = 5) => {
  // 1. Get Collections for this Pill with pagination
  let collectionQuery = `
    SELECT c.id, c.name, c.layout_type, c.aspect_ratio, npc.position
    FROM nav_pill_collections npc
    JOIN collections c ON npc.collection_id = c.id
    WHERE npc.nav_pill_id = ?
  `;
  let queryParams = [nav_pill_id];

  if (cursor !== null) {
    collectionQuery += ` AND npc.position > ?`;
    queryParams.push(cursor);
  }

  collectionQuery += ` ORDER BY npc.position ASC LIMIT ?`;
  queryParams.push(limit + 1);

  const [collections] = await db.query(collectionQuery, queryParams);

  if (collections.length === 0) return { sections: [], nextCursor: null, hasMore: false };

  const hasMore = collections.length > limit;
  const finalCollections = hasMore ? collections.slice(0, limit) : collections;
  const nextCursor = hasMore ? finalCollections[finalCollections.length - 1].position : null;

  const collectionIds = finalCollections.map(c => c.id);

  // 2. Fetch modules for each collection (fetch moduleLimit + 1 to determine if 'hasMore' is true)
  const [moduleRows] = await db.query(`
    SELECT * FROM (
      SELECT 
        m.id, m.title, m.thumbnail_url, m.is_free, cm.collection_id, cm.position,
        ROW_NUMBER() OVER (PARTITION BY cm.collection_id ORDER BY cm.position ASC) as rank_count
      FROM collection_modules cm
      JOIN modules m ON cm.module_id = m.id
      WHERE cm.collection_id IN (?) AND m.is_active = 1
    ) AS ranked_modules
    WHERE rank_count <= ?
  `, [collectionIds, moduleLimit + 1]);

  // 3. Map and attach pagination metadata to each collection
  const sections = finalCollections.map(col => {
    const allModules = moduleRows.filter(m => m.collection_id === col.id);
    const hasMoreModules = allModules.length > moduleLimit;
    const modules = hasMoreModules ? allModules.slice(0, moduleLimit) : allModules;
    
    return {
      ...col,
      modules: modules.map(m => ({
        ...m,
        rank_count: m.rank_count
      })),
      nextCursor: hasMoreModules ? modules[modules.length - 1].position : null,
      hasMore: hasMoreModules
    };
  });

  return { sections, nextCursor, hasMore };
};

export const get_nav_pill_collections = asyncHandler(async (req, res) => {
  handleValidationErrors(req);
  const { nav_pill_id } = req.params;
  const { limit = 5, cursor } = getCursorPaginationParams(req.query);
  const db = await dbConnectionPromise;
  
  const cacheKey = `cache:/api/v1/users/nav-pill/${nav_pill_id}:limit=${limit}:cursor=${cursor || 'start'}`;

  const result = await getOrSetCache(cacheKey, async () => {
    const fetchResult = await fetch_pill_collections_optimized(nav_pill_id, db, limit, cursor);
    return {
      nav_pill_id: parseInt(nav_pill_id),
      sections: fetchResult.sections,
      nextCursor: fetchResult.nextCursor,
      hasMore: fetchResult.hasMore
    };
  });

  return sendSuccess(res, { initial_data: result });
});

export const get_section_content = asyncHandler(async (req, res) => {
  handleValidationErrors(req);
  const { section_id } = req.params;
  const { limit, cursor, category_id } = getCursorPaginationParams(req.query); // Added category_id from query
  const db = await dbConnectionPromise;

  const cacheKey = `cache:/api/v1/users/section/${section_id}:limit=${limit}:cursor=${cursor || 'start'}:cat=${category_id || 'none'}`;

  const result = await getOrSetCache(cacheKey, async () => {
    // 1. Fetch Collection Metadata first to maintain response structure
    const [[collection]] = await db.query(`
      SELECT id, name, layout_type 
      FROM collections 
      WHERE id = ?
    `, [section_id]);

    if (!collection) return null;

    // 2. Build Module Query with optional Category Filtering
    let query = `
      SELECT m.id, m.title, m.thumbnail_url, m.is_free, cm.collection_id, cm.position
      FROM collection_modules cm
      JOIN modules m ON cm.module_id = m.id
      ${category_id ? 'JOIN module_category_mapping mc ON m.id = mc.module_id' : ''}
      WHERE cm.collection_id = ? AND m.is_active = 1
    `;
    
    let queryParams = [section_id];

    if (category_id) {
      query += ` AND mc.category_id = ?`;
      queryParams.push(category_id);
    }

    if (cursor) {
      query += ` AND cm.position > ?`;
      queryParams.push(cursor);
    }

    query += ` ORDER BY cm.position ASC LIMIT ?`;
    queryParams.push(limit + 1);

    const [rows] = await db.query(query, queryParams);

    // 3. Handle Pagination Logic
    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? data[data.length - 1].position : null;

    return {
      sections: [
        {
          ...collection,
          modules: data.map((row, index) => ({
            ...row,
            rank_count: index + 1
          })),
          nextCursor,
          hasMore
        }
      ]
    };
  });

  if (!result) return res.status(404).json({ message: "Section not found" });

  // 4. Return in the exact same format as Home Page Collections
  return sendSuccess(res, { initial_data: result });
});

export const getModulesLessonsData = asyncHandler(async (req, res) => {
  handleValidationErrors(req);
  const { module_id } = req.params;
  const { limit, cursor } = getCursorPaginationParams(req.query);
  const { syllabus_id } = req.query;
  const user_id = req.user?.id;
  const db = await dbConnectionPromise;

  // 1. Fetch Module info, User Email & User Subscription in parallel
  const [moduleRows, userRows, subRows] = await Promise.all([
    db.query(`SELECT id, title, description, thumbnail_url, is_free FROM modules WHERE id = ? AND is_active = 1`, [module_id]),
    user_id ? db.query(`SELECT email FROM users WHERE id = ?`, [user_id]) : [[]],
    user_id ? db.query(
      `SELECT status, current_period_end FROM user_subscriptions WHERE user_id = ? AND status IN ('active', 'trialing') AND current_period_end > NOW() LIMIT 1`, 
      [user_id]
    ) : [[]]
  ]);

  const moduleInfo = moduleRows[0][0];
  if (!moduleInfo) throw createError("Module not found", 404);

  const email = userRows[0]?.[0]?.email;
  const isUserReviewer = isReviewer(email);
  const hasActiveSub = subRows[0].length > 0;
  
  const hasAccess = moduleInfo.is_free === 1 || hasActiveSub || isUserReviewer;

  const cacheKey = `cache:/api/v1/users/modules-lessons/${module_id}:limit=${limit}:cursor=${cursor || 'start'}:syllabus=${syllabus_id || 'all'}:access=${hasAccess}:rev=${isUserReviewer}`;

  const result = await getOrSetCache(cacheKey, async () => {
    // 2. Optimized: Fetch all syllabus and their top lessons in ONE query
    let query = `
      SELECT * FROM (
        SELECT 
          s.id as syllabus_id, s.title as syllabus_title, s.workout_instructions as syllabus_workout_instructions, s.position as s_position,
          l.id as lesson_id, l.title as lesson_title, l.workout_instructions as lesson_workout_instructions, l.position as l_position, v.video_provider_id, v.ui_style,
          ROW_NUMBER() OVER (PARTITION BY s.id ORDER BY l.position ASC) as lesson_rank
        FROM syllabus s
        LEFT JOIN lessons l ON s.id = l.syllabus_id
        LEFT JOIN videos v ON l.id = v.lesson_id
        WHERE s.module_id = ?
    `;
    
    const queryParams = [module_id];
    
    if (syllabus_id) {
      query += " AND s.id = ?";
      queryParams.push(syllabus_id);
    }
    
    if (cursor) {
      query += " AND l.position > (SELECT position FROM lessons WHERE id = ?)";
      queryParams.push(cursor);
    }
    
    query += `
      ) AS ranked_content
      WHERE lesson_rank <= ?
      ORDER BY s_position ASC, l_position ASC
    `;
    queryParams.push(limit + 1);

    const [rows] = await db.query(query, queryParams);

    // 3. Transform flat rows into nested JSON
    const syllabus = rows.reduce((acc, row) => {
      let s = acc.find(item => item.id === row.syllabus_id);
      if (!s) {
        s = { 
          id: row.syllabus_id, 
          title: row.syllabus_title, 
          workout_instructions: row.syllabus_workout_instructions,
          lessons: [], 
          hasMore: false, 
          nextCursor: null 
        };
        acc.push(s);
      }
      
      if (row.lesson_id) {
        if (s.lessons.length < limit) {
          const lesson = { 
            id: row.lesson_id, 
            title: row.lesson_title,
            workout_instructions: row.lesson_workout_instructions
          };
          
          // Only provide video data if user has access
          if (hasAccess) {
            lesson.video_provider_id = row.video_provider_id;
            lesson.ui_style = row.ui_style;
          }

          s.lessons.push(lesson);
          s.nextCursor = row.lesson_id;
        } else {
          s.hasMore = true;
        }
      }
      return acc;
    }, []);

    syllabus.forEach(s => {
      if (!s.hasMore) s.nextCursor = null;
    });

    return { module: moduleInfo, syllabus, hasAccess, is_reviewer: isUserReviewer };
  });

  return sendSuccess(res, result);
});

export const get_lesson_data = asyncHandler(async (req, res) => {
  handleValidationErrors(req);
  const { video_provider_id, ui_style } = req.params;
  const user_id = req.user?.id;
  const db = await dbConnectionPromise;

  // 1. Check if the module containing this video is free and get workout instructions
  const [[accessInfo]] = await db.query(`
    SELECT m.is_free 
    FROM videos v
    JOIN lessons l ON v.lesson_id = l.id
    JOIN syllabus s ON l.syllabus_id = s.id
    JOIN modules m ON s.module_id = m.id
    WHERE v.video_provider_id = ? AND m.is_active = 1
    LIMIT 1
  `, [video_provider_id]);

  if (!accessInfo) throw createError("Lesson not found", 404);

  // 2. If not free, check user subscription or reviewer status
  if (accessInfo.is_free !== 1) {
    if (!user_id) throw createError("Subscription required", 403);

    const [[user]] = await db.query(`SELECT email FROM users WHERE id = ?`, [user_id]);
    const isUserReviewer = isReviewer(user?.email);

    if (!isUserReviewer) {
      const [[subscription]] = await db.query(
        `SELECT status FROM user_subscriptions 
         WHERE user_id = ? AND status IN ('active', 'trialing') 
         AND current_period_end > NOW() LIMIT 1`,
        [user_id]
      );

      if (!subscription) throw createError("Active subscription required", 403);
    }
  }

  const cacheKey = `vimeo:${video_provider_id}`;
  const videoData = await getOrSetCache(cacheKey, async () => {
    const vimeoResponse = await fetchVimeoVideoData(video_provider_id);
    return vimeoResponse?.data || null;
  }, 86400 * 7); // Cache vimeo data for 7 days

  return sendSuccess(res, { 
    ...videoData, 
    ui_style
  });
});

export const getPlans = asyncHandler(async (req, res) => {
  const db = await dbConnectionPromise;
  const cacheKey = "cache:/api/v1/users/plans";

  const plans = await getOrSetCache(cacheKey, async () => {
    const [data] = await db.query(
      "SELECT id, plan_name, monthly_price, duration_value, duration_unit FROM plans WHERE is_active = 1 ORDER BY id ASC"
    );
    return data;
  });

  return sendSuccess(res, plans);
});

export const get_latest_subscription = asyncHandler(async (req, res) => {
  const user_id = req.user.id;

  const db = await dbConnectionPromise;
  const [[subscription]] = await db.query(
    `SELECT us.stripe_sub_id as sub_id, us.status, p.plan_name as plan, 
     p.monthly_price as amount, p.duration_value as plan_duration_value, p.duration_unit as plan_duration_type, us.current_period_end as expiry, p.max_screens as max_devices
     FROM user_subscriptions us
     JOIN plans p ON us.plan_id = p.id
     WHERE us.user_id = ? 
     ORDER BY us.id DESC LIMIT 1`,
    [user_id]
  );

  return sendSuccess(res, { 
    subscription: subscription || null 
  });
});
