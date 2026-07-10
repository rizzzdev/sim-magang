import { prisma } from '@/database/index.js';

export class DashboardService {
  async getAdminStats() {
    const [totalStudents, totalTeachers, totalMentors, totalCompanies, totalPlacements, activePlacements] = await Promise.all([
      prisma.student.count({ where: { deletedAt: null } }),
      prisma.teacher.count({ where: { deletedAt: null } }),
      prisma.industryMentor.count({ where: { deletedAt: null } }),
      prisma.company.count({ where: { deletedAt: null } }),
      prisma.internshipPlacement.count({ where: { deletedAt: null } }),
      prisma.internshipPlacement.count({ where: { deletedAt: null, status: 'active' } })
    ]);
    const activeStudents = activePlacements;
    const nonActiveStudents = totalStudents - activeStudents;
    return { totalStudents, totalTeachers, totalMentors, totalCompanies, totalPlacements, activeStudents, nonActiveStudents };
  }

  async getProfileNameByEmail(email: string) {
    const identifier = await prisma.sentri_identifiers.findFirst({
      where: { type: 'email', value: email },
      include: { sentri_users: { include: { student: true, teacher: true, industryMentor: true } } }
    });
    const user = identifier?.sentri_users;
    if (!user) return { name: 'Super Admin', role: 'admin' };
    if (user.student) {
      const placement = await prisma.internshipPlacement.findFirst({ where: { studentId: user.student.id, status: 'active' } });
      return { name: user.student.name, role: 'student', studentId: user.student.id, placementId: placement?.id };
    }
    if (user.teacher) {
      const prefix = user.teacher.prefixTitle ? user.teacher.prefixTitle + ' ' : '';
      const suffix = user.teacher.suffixTitle ? ', ' + user.teacher.suffixTitle : '';
      return { name: prefix + user.teacher.name + suffix, role: 'teacher', teacherId: user.teacher.id };
    }
    if (user.industryMentor) {
      const prefix = user.industryMentor.prefixTitle ? user.industryMentor.prefixTitle + ' ' : '';
      const suffix = user.industryMentor.suffixTitle ? ', ' + user.industryMentor.suffixTitle : '';
      return { name: prefix + user.industryMentor.name + suffix, role: 'mentor', mentorId: user.industryMentor.id };
    }
    return { name: 'Super Admin', role: 'admin' };
  }

  async getProfileNameById(sentriUserId: string) {
    const user = await prisma.sentri_users.findUnique({
      where: { id: sentriUserId },
      include: { student: true, teacher: true, industryMentor: true }
    });
    if (!user) return { name: 'Super Admin', role: 'admin' };
    if (user.student) {
      const placement = await prisma.internshipPlacement.findFirst({ where: { studentId: user.student.id, status: 'active' } });
      return { name: user.student.name, role: 'student', studentId: user.student.id, placementId: placement?.id };
    }
    if (user.teacher) {
      const prefix = user.teacher.prefixTitle ? user.teacher.prefixTitle + ' ' : '';
      const suffix = user.teacher.suffixTitle ? ', ' + user.teacher.suffixTitle : '';
      return { name: prefix + user.teacher.name + suffix, role: 'teacher', teacherId: user.teacher.id };
    }
    if (user.industryMentor) {
      const prefix = user.industryMentor.prefixTitle ? user.industryMentor.prefixTitle + ' ' : '';
      const suffix = user.industryMentor.suffixTitle ? ', ' + user.industryMentor.suffixTitle : '';
      return { name: prefix + user.industryMentor.name + suffix, role: 'mentor', mentorId: user.industryMentor.id };
    }
    return { name: 'Super Admin', role: 'admin' };
  }

  async getMentorStats(mentorId: string, dateStr: string) {
    const startOfDay = new Date(dateStr + 'T00:00:00.000Z');
    const endOfDay = new Date(dateStr + 'T23:59:59.999Z');
    const [activeStudents, pendingLogbooks, checkInToday, checkOutToday, pendingAssessments, pendingCertificates, assessableStudents, completedStudents, totalPlacements, totalLogbooks] = await Promise.all([
      prisma.internshipPlacement.count({ where: { industryMentorId: mentorId, status: 'active', deletedAt: null } }),
      prisma.dailyLogbook.count({ where: { placement: { industryMentorId: mentorId }, mentorStatus: { not: 'approved' }, deletedAt: null } }),
      prisma.attendance.count({ where: { placement: { industryMentorId: mentorId, status: 'active', deletedAt: null }, type: 'check_in', status: 'accepted', date: startOfDay, deletedAt: null } }),
      prisma.attendance.count({ where: { placement: { industryMentorId: mentorId, status: 'active', deletedAt: null }, type: 'check_out', status: 'accepted', date: startOfDay, deletedAt: null } }),
      prisma.internshipPlacement.count({ where: { industryMentorId: mentorId, status: { in: ['active', 'completed'] }, isAssessable: true, deletedAt: null, assessments: { none: { assessorType: 'industry_mentor', deletedAt: null } } } }),
      prisma.internshipPlacement.count({ where: { industryMentorId: mentorId, status: 'completed', deletedAt: null, assessments: { none: { assessorType: 'industry_mentor', attachmentId: { not: null }, deletedAt: null } } } }),
      prisma.internshipPlacement.count({ where: { industryMentorId: mentorId, status: { in: ['active', 'completed'] }, isAssessable: true, deletedAt: null } }),
      prisma.internshipPlacement.count({ where: { industryMentorId: mentorId, status: 'completed', deletedAt: null } }),
      prisma.internshipPlacement.count({ where: { industryMentorId: mentorId, deletedAt: null } }),
      prisma.dailyLogbook.count({ where: { placement: { industryMentorId: mentorId, status: 'active' }, deletedAt: null } })
    ]);
    return {
      activeStudents: { current: activeStudents, total: totalPlacements },
      checkInToday: { current: checkInToday, total: activeStudents },
      checkOutToday: { current: checkOutToday, total: activeStudents },
      approvedLogbooks: { current: totalLogbooks - pendingLogbooks, total: totalLogbooks },
      completedAssessments: { current: assessableStudents - pendingAssessments, total: assessableStudents },
      uploadedCertificates: { current: completedStudents - pendingCertificates, total: completedStudents }
    };
  }

  async getTeacherStats(teacherId: string, dateStr: string) {
    const startOfDay = new Date(dateStr + 'T00:00:00.000Z');
    const endOfDay = new Date(dateStr + 'T23:59:59.999Z');
    const [activeStudents, pendingLogbooks, checkInToday, checkOutToday, pendingAssessments, assessableStudents, totalPlacements, totalLogbooks] = await Promise.all([
      prisma.internshipPlacement.count({ where: { teacherId, status: 'active', deletedAt: null } }),
      prisma.dailyLogbook.count({ where: { placement: { teacherId }, teacherStatus: { not: 'approved' }, deletedAt: null } }),
      prisma.attendance.count({ where: { placement: { teacherId, status: 'active', deletedAt: null }, type: 'check_in', status: 'accepted', date: startOfDay, deletedAt: null } }),
      prisma.attendance.count({ where: { placement: { teacherId, status: 'active', deletedAt: null }, type: 'check_out', status: 'accepted', date: startOfDay, deletedAt: null } }),
      prisma.internshipPlacement.count({ where: { teacherId, status: { in: ['active', 'completed'] }, isAssessable: true, deletedAt: null, assessments: { none: { assessorType: 'teacher', deletedAt: null } } } }),
      prisma.internshipPlacement.count({ where: { teacherId, status: { in: ['active', 'completed'] }, isAssessable: true, deletedAt: null } }),
      prisma.internshipPlacement.count({ where: { teacherId, deletedAt: null } }),
      prisma.dailyLogbook.count({ where: { placement: { teacherId, status: 'active' }, deletedAt: null } })
    ]);
    return {
      activeStudents: { current: activeStudents, total: totalPlacements },
      checkInToday: { current: checkInToday, total: activeStudents },
      checkOutToday: { current: checkOutToday, total: activeStudents },
      approvedLogbooks: { current: totalLogbooks - pendingLogbooks, total: totalLogbooks },
      completedAssessments: { current: assessableStudents - pendingAssessments, total: assessableStudents }
    };
  }

  async getStudentStats(studentId: string, dateStr: string) {
    const startOfDay = new Date(dateStr + 'T00:00:00.000Z');
    const [totalPlacements, activePlacements, checkInToday, checkOutToday, totalLogbooks, approvedLogbooks, completedPlacements, placementsWithCertificate] = await Promise.all([
      prisma.internshipPlacement.count({ where: { studentId, deletedAt: null } }),
      prisma.internshipPlacement.count({ where: { studentId, status: 'active', deletedAt: null } }),
      prisma.attendance.count({ where: { placement: { studentId, status: 'active', deletedAt: null }, type: 'check_in', date: startOfDay, deletedAt: null } }),
      prisma.attendance.count({ where: { placement: { studentId, status: 'active', deletedAt: null }, type: 'check_out', date: startOfDay, deletedAt: null } }),
      prisma.dailyLogbook.count({ where: { placement: { studentId, status: 'active', deletedAt: null }, deletedAt: null } }),
      prisma.dailyLogbook.count({ where: { placement: { studentId, status: 'active', deletedAt: null }, mentorStatus: 'approved', teacherStatus: 'approved', deletedAt: null } }),
      prisma.internshipPlacement.count({ where: { studentId, status: 'completed', deletedAt: null } }),
      prisma.internshipPlacement.count({ where: { studentId, deletedAt: null, assessments: { some: { attachmentId: { not: null }, deletedAt: null } } } })
    ]);
    return {
      activeInternships: { current: activePlacements, total: totalPlacements },
      checkInToday: { current: checkInToday, total: activePlacements },
      checkOutToday: { current: checkOutToday, total: activePlacements },
      approvedLogbooks: { current: approvedLogbooks, total: totalLogbooks },
      gradedInternships: { current: completedPlacements, total: totalPlacements },
      uploadedCertificates: { current: placementsWithCertificate, total: totalPlacements }
    };
  }
}
