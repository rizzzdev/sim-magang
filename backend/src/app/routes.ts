import { Router } from 'express';
import { sentriAuth } from '@/lib/sentri.js';
import { studentRoute } from '@/modules/student/index.js';
import { teacherRoute } from '@/modules/teacher/index.js';
import { companyRoute } from '@/modules/company/index.js';
import { industryMentorRoute } from '@/modules/industry-mentor/index.js';
import { internshipPlacementRoute } from '@/modules/internship-placement/index.js';
import { dailyLogbookRoute } from '@/modules/daily-logbook/index.js';
import { assessmentRoute } from '@/modules/assessment/index.js';
import { attachmentRoute } from '@/modules/attachment/index.js';
import { attachmentController } from '@/modules/attachment/controller/index.js';
import { activityRoute } from '@/modules/activity/index.js';
import { dashboardRoute } from '@/modules/dashboard/index.js';
import { attendanceRoute } from '@/modules/attendance/index.js';

export const appRoutes = Router();

// Endpoint file attachment (public)
appRoutes.get('/attachments/file/:filename', attachmentController.serveFile);

appRoutes.use(sentriAuth.protect());

// Daftarkan semua module routes
appRoutes.use('/students', studentRoute);
appRoutes.use('/teachers', teacherRoute);
appRoutes.use('/companies', companyRoute);
appRoutes.use('/industry-mentors', industryMentorRoute);
appRoutes.use('/internship-placements', internshipPlacementRoute);
appRoutes.use('/daily-logbooks', dailyLogbookRoute);
appRoutes.use('/assessments', assessmentRoute);
appRoutes.use('/attachments', attachmentRoute);
appRoutes.use('/activities', activityRoute);
appRoutes.use('/dashboard', dashboardRoute);
appRoutes.use('/attendances', attendanceRoute);
