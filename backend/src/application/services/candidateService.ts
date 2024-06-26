import { Candidate } from '../../domain/models/Candidate';
import { validateCandidateData } from '../validator';
import { Education, EducationData } from '../../domain/models/Education';
import {
  WorkExperience,
  WorkExperienceData,
} from '../../domain/models/WorkExperience';
import { Resume, ResumeData } from '../../domain/models/Resume';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const addCandidate = async (candidateData: any) => {
  try {
    validateCandidateData(candidateData); // Validar los datos del candidato
  } catch (error: any) {
    throw error;
  }

  try {
    return await prisma.$transaction(async () => {
      const candidate = new Candidate(candidateData); // Crear una instancia del modelo Candidate
      const savedCandidate = await candidate.save(); // Guardar el candidato en la base de datos
      const candidateId = savedCandidate.id; // Obtener el ID del candidato guardado

      // Guardar la educación del candidato
      if (candidateData.educations) {
        for (const education of candidateData.educations) {
          const educationModel = new Education(education);
          await educationModel.save(candidateId);
          candidate.education.push(educationModel);
        }
      }

      // Guardar la experiencia laboral del candidato
      if (candidateData.workExperiences) {
        for (const experience of candidateData.workExperiences) {
          const experienceModel = new WorkExperience(experience);
          experienceModel.candidateId = candidateId;
          await experienceModel.save();
          candidate.workExperience.push(experienceModel);
        }
      }

      // Guardar los archivos de CV
      if (candidateData.cv && Object.keys(candidateData.cv).length > 0) {
        const resumeModel = new Resume(candidateData.cv);
        resumeModel.candidateId = candidateId;
        await resumeModel.save();
        candidate.resumes.push(resumeModel);
      }
      return savedCandidate;
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      // Unique constraint failed on the fields: (`email`)
      throw new Error('The email already exists in the database');
    } else {
      throw error;
    }
  }
};

export const getCandidate = async (id: number) => {
  try {
    const candidate = await Candidate.findOne(id);
    if (!candidate) {
      throw new Error('Candidate not found');
    }

    const educations = (await Education.findAll(id)) as EducationData[];
    const workExperiences = (await WorkExperience.findAll(
      id,
    )) as WorkExperienceData[];
    const resumes = (await Resume.findAll(id)) as ResumeData[];

    return {
      ...candidate,
      education: educations,
      workExperience: workExperiences,
      resumes: resumes,
    };
  } catch (error: any) {
    throw new Error(`Failed to fetch candidate data: ${error.message}`);
  }
};
