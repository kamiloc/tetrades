/**
 * Prisma seed — realistic Colombian athlete data for local development.
 *
 * Idempotent: wipes existing rows in reverse FK order before inserting fresh data.
 * L2-CONFIDENTIAL fields (private profile identity and contact data) are
 * encrypted with @packages/crypto using
 * MASTER_ENCRYPTION_KEY from the local environment.
 *
 * Run via:
 *   npx prisma db seed                  (uses the package.json prisma.seed config)
 *   or: tsx prisma/seed.ts
 */

import 'dotenv/config';

import { randomUUID } from 'node:crypto';

import { encryptPII } from '@packages/crypto';
import {
  AccountStatus,
  ConnectionStatus,
  DataLifecycleStatus,
  DataLifecycleType,
  OnboardingStatus,
  PhotoVariant,
  PrismaClient,
  ProcessingStatus,
  ProfileStatus,
  UserRole,
  VerificationStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.length === 0) {
    throw new Error(`Environment variable ${name} is required to run the seed.`);
  }
  return value;
}

const MASTER_KEY = requireEnv('MASTER_ENCRYPTION_KEY');
const KEY_VERSION = 'v1';

function enc(plaintext: string): Buffer {
  return encryptPII(plaintext, MASTER_KEY);
}

function isoDate(input: string): Date {
  return new Date(input);
}

// ---------------------------------------------------------------------------
// Static seed definitions
// ---------------------------------------------------------------------------

const SPORTS: ReadonlyArray<{ name: string; category: string }> = [
  { name: 'Fútbol', category: 'Team Sports' },
  { name: 'Ciclismo BMX', category: 'Cycling' },
  { name: 'Boxeo', category: 'Combat Sports' },
  { name: 'Atletismo', category: 'Track and Field' },
  { name: 'Levantamiento de Pesas', category: 'Strength Sports' },
];

type AthleteSeed = {
  readonly slug: string;
  readonly displayName: string;
  readonly supabaseUserId: string;
  readonly sportName: string;
  readonly city: string;
  readonly primaryPosition: string;
  readonly publicBio: string;
  readonly contactEmail: string;
  readonly contactPhone: string;
  readonly govId: string;
  readonly dob: string;
  readonly onboardingStatus: OnboardingStatus;
  readonly profileStatus: ProfileStatus;
  readonly achievements: ReadonlyArray<{
    title: string;
    organization: string;
    achievedOn: string;
    verificationStatus: VerificationStatus;
    verificationSource: string | null;
  }>;
};

const ATHLETES: ReadonlyArray<AthleteSeed> = [
  {
    slug: 'daniel-mendoza-restrepo',
    displayName: 'Daniel Mendoza Restrepo',
    supabaseUserId: 'seed-supabase-user-daniel-mendoza',
    sportName: 'Fútbol',
    city: 'Medellín',
    primaryPosition: 'Mediocampista Central',
    publicBio:
      'Mediocampista paisa con formación en las divisiones menores del Atlético Nacional. Enfocado en lectura de juego y recuperación.',
    contactEmail: 'daniel.mendoza@example.co',
    contactPhone: '+57 300 412 7785',
    govId: '1037612894',
    dob: '1999-04-18',
    onboardingStatus: OnboardingStatus.COMPLETE,
    profileStatus: ProfileStatus.ACTIVE,
    achievements: [
      {
        title: 'Campeón Liga BetPlay Sub-20',
        organization: 'Dimayor',
        achievedOn: '2021-11-14',
        verificationStatus: VerificationStatus.VERIFIED,
        verificationSource: 'dimayor.com.co',
      },
      {
        title: 'Mejor mediocampista Torneo Apertura Sub-20',
        organization: 'Atlético Nacional',
        achievedOn: '2021-06-02',
        verificationStatus: VerificationStatus.PENDING,
        verificationSource: null,
      },
    ],
  },
  {
    slug: 'carolina-rios-villegas',
    displayName: 'Carolina Ríos Villegas',
    supabaseUserId: 'seed-supabase-user-carolina-rios',
    sportName: 'Ciclismo BMX',
    city: 'Pereira',
    primaryPosition: 'Elite BMX Racing',
    publicBio:
      'Ciclista BMX risaraldense con podios en Copa Mundo UCI. Entrena en la pista olímpica de Pereira y representa al equipo nacional.',
    contactEmail: 'carolina.rios@example.co',
    contactPhone: '+57 311 553 9027',
    govId: '1093215476',
    dob: '1996-09-03',
    onboardingStatus: OnboardingStatus.COMPLETE,
    profileStatus: ProfileStatus.ACTIVE,
    achievements: [
      {
        title: 'Bronce Copa Mundo UCI BMX — Argentina',
        organization: 'Unión Ciclista Internacional',
        achievedOn: '2023-04-29',
        verificationStatus: VerificationStatus.VERIFIED,
        verificationSource: 'uci.org',
      },
      {
        title: 'Campeona Panamericana BMX Elite',
        organization: 'COPACI',
        achievedOn: '2022-07-16',
        verificationStatus: VerificationStatus.VERIFIED,
        verificationSource: 'copaci.org',
      },
      {
        title: 'Récord nacional pista BMX Pereira',
        organization: 'Federación Colombiana de Ciclismo',
        achievedOn: '2024-02-11',
        verificationStatus: VerificationStatus.UNVERIFIED,
        verificationSource: null,
      },
    ],
  },
  {
    slug: 'sebastian-cardenas-aristizabal',
    displayName: 'Sebastián Cárdenas Aristizábal',
    supabaseUserId: 'seed-supabase-user-sebastian-cardenas',
    sportName: 'Boxeo',
    city: 'Cali',
    primaryPosition: 'Peso Welter',
    publicBio:
      'Boxeador caleño categoría welter. Medallista en Juegos Nacionales y aspirante al ciclo olímpico París–Los Ángeles.',
    contactEmail: 'sebastian.cardenas@example.co',
    contactPhone: '+57 320 778 4412',
    govId: '1144056219',
    dob: '1998-12-21',
    onboardingStatus: OnboardingStatus.COMPLETE,
    profileStatus: ProfileStatus.ACTIVE,
    achievements: [
      {
        title: 'Oro Juegos Nacionales Bolivarianos — Welter',
        organization: 'Federación Colombiana de Boxeo',
        achievedOn: '2022-11-09',
        verificationStatus: VerificationStatus.VERIFIED,
        verificationSource: 'fedeboxeo.com',
      },
      {
        title: 'Plata Campeonato Suramericano Adulto',
        organization: 'Confederación Suramericana de Boxeo',
        achievedOn: '2023-08-22',
        verificationStatus: VerificationStatus.PENDING,
        verificationSource: null,
      },
    ],
  },
  {
    slug: 'valentina-hernandez-lozano',
    displayName: 'Valentina Hernández Lozano',
    supabaseUserId: 'seed-supabase-user-valentina-hernandez',
    sportName: 'Atletismo',
    city: 'Barranquilla',
    primaryPosition: '400m vallas',
    publicBio:
      'Atleta barranquillera especialista en 400 metros con vallas. Entrena en el Estadio Romelio Martínez y representa al Atlántico.',
    contactEmail: 'valentina.hernandez@example.co',
    contactPhone: '+57 315 220 6638',
    govId: '1045882370',
    dob: '2000-02-27',
    onboardingStatus: OnboardingStatus.CONSENT_PENDING,
    profileStatus: ProfileStatus.ACTIVE,
    achievements: [
      {
        title: 'Récord nacional Sub-23 400m vallas',
        organization: 'Federación Colombiana de Atletismo',
        achievedOn: '2023-05-19',
        verificationStatus: VerificationStatus.VERIFIED,
        verificationSource: 'fecodatletismo.com',
      },
      {
        title: 'Finalista Juegos Suramericanos Asunción',
        organization: 'ODESUR',
        achievedOn: '2022-10-08',
        verificationStatus: VerificationStatus.VERIFIED,
        verificationSource: 'odesur.org',
      },
    ],
  },
  {
    slug: 'andres-quintero-salazar',
    displayName: 'Andrés Quintero Salazar',
    supabaseUserId: 'seed-supabase-user-andres-quintero',
    sportName: 'Levantamiento de Pesas',
    city: 'Bogotá',
    primaryPosition: '89 kg',
    publicBio:
      'Pesista bogotano categoría 89 kg. Disciplinas: arranque y envión. Parte del equipo nacional con base en el CAR de Cota.',
    contactEmail: 'andres.quintero@example.co',
    contactPhone: '+57 318 991 4408',
    govId: '1019089332',
    dob: '1997-07-12',
    onboardingStatus: OnboardingStatus.IDENTITY_PENDING,
    profileStatus: ProfileStatus.DRAFT,
    achievements: [
      {
        title: 'Plata Campeonato Panamericano 89 kg',
        organization: 'Panam Sports',
        achievedOn: '2023-04-15',
        verificationStatus: VerificationStatus.VERIFIED,
        verificationSource: 'panamsports.org',
      },
      {
        title: 'Récord nacional envión 89 kg',
        organization: 'Federación Colombiana de Levantamiento de Pesas',
        achievedOn: '2024-03-02',
        verificationStatus: VerificationStatus.UNVERIFIED,
        verificationSource: null,
      },
    ],
  },
];

// Photo variant pixel dimensions (mirror image-optimization rules).
const PHOTO_VARIANTS: ReadonlyArray<{ variant: PhotoVariant; width: number; height: number }> = [
  { variant: PhotoVariant.ORIGINAL, width: 2400, height: 2400 },
  { variant: PhotoVariant.FULL_1200, width: 1200, height: 1200 },
  { variant: PhotoVariant.CARD_400, width: 400, height: 400 },
  { variant: PhotoVariant.THUMB_150, width: 150, height: 150 },
];

// ---------------------------------------------------------------------------
// Wipe + seed
// ---------------------------------------------------------------------------

async function wipe(): Promise<void> {
  // FK-respecting deletion order. The AthletePublicProfile -> ProfilePhotoAsset
  // avatar FK is satisfied because we delete the profile before the photo.
  await prisma.dataLifecycleRequest.deleteMany();
  await prisma.auditEvent.deleteMany();
  await prisma.piiConsentLog.deleteMany();
  await prisma.athleteConnection.deleteMany();
  await prisma.athleteAchievement.deleteMany();
  await prisma.athletePublicProfile.deleteMany();
  await prisma.athletePrivateProfile.deleteMany();
  await prisma.profilePhotoAsset.deleteMany();
  await prisma.athlete.deleteMany();
  await prisma.sport.deleteMany();
  await prisma.userAccount.deleteMany();
}

async function main(): Promise<void> {
  console.log('Seed: wiping existing rows...');
  await wipe();

  console.log('Seed: creating SYSTEM account...');
  const systemAccount = await prisma.userAccount.create({
    data: {
      supabaseUserId: 'seed-supabase-user-system',
      role: UserRole.SYSTEM,
      status: AccountStatus.ACTIVE,
    },
    select: { id: true },
  });

  console.log('Seed: creating sports...');
  const sportRecords = new Map<string, string>();
  for (const sport of SPORTS) {
    const created = await prisma.sport.create({
      data: { name: sport.name, category: sport.category, isActive: true },
      select: { id: true, name: true },
    });
    sportRecords.set(created.name, created.id);
  }

  console.log('Seed: creating athletes, profiles, photos, achievements...');
  const athleteIdsBySlug = new Map<string, string>();

  for (const seed of ATHLETES) {
    const sportId = sportRecords.get(seed.sportName);
    if (sportId === undefined) {
      throw new Error(`Sport "${seed.sportName}" was not seeded; cannot create athlete ${seed.slug}.`);
    }

    const userAccount = await prisma.userAccount.create({
      data: {
        supabaseUserId: seed.supabaseUserId,
        role: UserRole.ATHLETE,
        status: AccountStatus.ACTIVE,
      },
      select: { id: true },
    });

    const athlete = await prisma.athlete.create({
      data: {
        userAccountId: userAccount.id,
        slug: seed.slug,
        displayName: seed.displayName,
        sportId,
        countryCode: 'CO',
        profileStatus: seed.profileStatus,
        isUnderLegalHold: false,
      },
      select: { id: true },
    });
    athleteIdsBySlug.set(seed.slug, athlete.id);

    await prisma.athletePrivateProfile.create({
      data: {
        athleteId: athlete.id,
        exactDobEnc: enc(seed.dob),
        contactEmailEnc: enc(seed.contactEmail),
        contactPhoneEnc: enc(seed.contactPhone),
        govIdEnc: enc(seed.govId),
        encryptionKeyVersion: KEY_VERSION,
        onboardingStatus: seed.onboardingStatus,
      },
    });

    // Create 4 photo variants; pick CARD_400 as the public avatar.
    let avatarAssetId: string | null = null;
    for (const variant of PHOTO_VARIANTS) {
      const photo = await prisma.profilePhotoAsset.create({
        data: {
          athleteId: athlete.id,
          variant: variant.variant,
          objectPath: `profile-photos/${athlete.id}/${variant.variant.toLowerCase()}.${
            variant.variant === PhotoVariant.ORIGINAL ? 'jpg' : 'webp'
          }`,
          width: variant.width,
          height: variant.height,
          processingStatus: ProcessingStatus.READY,
        },
        select: { id: true, variant: true },
      });
      if (photo.variant === PhotoVariant.CARD_400) {
        avatarAssetId = photo.id;
      }
    }

    await prisma.athletePublicProfile.create({
      data: {
        athleteId: athlete.id,
        publicBio: seed.publicBio,
        city: seed.city,
        primaryPosition: seed.primaryPosition,
        connectionCountCache: 0,
        avatarAssetId,
        isSearchable: seed.profileStatus === ProfileStatus.ACTIVE,
      },
    });

    for (const achievement of seed.achievements) {
      await prisma.athleteAchievement.create({
        data: {
          athleteId: athlete.id,
          title: achievement.title,
          organization: achievement.organization,
          achievedOn: isoDate(achievement.achievedOn),
          verificationStatus: achievement.verificationStatus,
          verificationSource: achievement.verificationSource,
        },
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Connections (status + count cache)
  // ---------------------------------------------------------------------------
  console.log('Seed: creating connections...');

  function athleteId(slug: string): string {
    const id = athleteIdsBySlug.get(slug);
    if (id === undefined) {
      throw new Error(`Unknown athlete slug while creating connection: ${slug}`);
    }
    return id;
  }

  const connections: ReadonlyArray<{
    requester: string;
    addressee: string;
    status: ConnectionStatus;
    respondedAt: string | null;
  }> = [
    {
      requester: 'daniel-mendoza-restrepo',
      addressee: 'carolina-rios-villegas',
      status: ConnectionStatus.ACCEPTED,
      respondedAt: '2024-09-15T18:32:10Z',
    },
    {
      requester: 'daniel-mendoza-restrepo',
      addressee: 'sebastian-cardenas-aristizabal',
      status: ConnectionStatus.PENDING,
      respondedAt: null,
    },
    {
      requester: 'carolina-rios-villegas',
      addressee: 'valentina-hernandez-lozano',
      status: ConnectionStatus.ACCEPTED,
      respondedAt: '2024-08-04T13:10:00Z',
    },
    {
      requester: 'sebastian-cardenas-aristizabal',
      addressee: 'andres-quintero-salazar',
      status: ConnectionStatus.DECLINED,
      respondedAt: '2024-07-22T09:48:53Z',
    },
    {
      requester: 'valentina-hernandez-lozano',
      addressee: 'andres-quintero-salazar',
      status: ConnectionStatus.ACCEPTED,
      respondedAt: '2024-10-02T22:01:14Z',
    },
  ];

  const acceptedCounts = new Map<string, number>();
  for (const conn of connections) {
    const requesterId = athleteId(conn.requester);
    const addresseeId = athleteId(conn.addressee);
    await prisma.athleteConnection.create({
      data: {
        requesterId,
        addresseeId,
        status: conn.status,
        respondedAt: conn.respondedAt === null ? null : new Date(conn.respondedAt),
      },
    });
    if (conn.status === ConnectionStatus.ACCEPTED) {
      acceptedCounts.set(requesterId, (acceptedCounts.get(requesterId) ?? 0) + 1);
      acceptedCounts.set(addresseeId, (acceptedCounts.get(addresseeId) ?? 0) + 1);
    }
  }

  for (const [aid, count] of acceptedCounts) {
    await prisma.athletePublicProfile.update({
      where: { athleteId: aid },
      data: { connectionCountCache: count },
    });
  }

  // ---------------------------------------------------------------------------
  // PII consent logs
  // ---------------------------------------------------------------------------
  console.log('Seed: creating consent logs...');

  const consentTemplates: ReadonlyArray<{
    readonly purposeCode: string;
    readonly consentVersion: string;
    readonly granted: boolean;
    readonly grantedAt: string;
    readonly revokedAt: string | null;
    readonly evidenceRef: string | null;
  }> = [
    {
      purposeCode: 'PUBLIC_PROFILE_DISPLAY',
      consentVersion: '2025-01-15',
      granted: true,
      grantedAt: '2025-01-15T10:01:30Z',
      revokedAt: null,
      evidenceRef: 'consent-ui:public-profile:v2025-01-15',
    },
    {
      purposeCode: 'DATA_EXPORT',
      consentVersion: '2025-01-15',
      granted: true,
      grantedAt: '2025-01-15T10:02:10Z',
      revokedAt: null,
      evidenceRef: 'consent-ui:export:v2025-01-15',
    },
  ];

  for (const slug of athleteIdsBySlug.keys()) {
    const aid = athleteId(slug);
    for (const template of consentTemplates) {
      await prisma.piiConsentLog.create({
        data: {
          athleteId: aid,
          purposeCode: template.purposeCode,
          consentVersion: template.consentVersion,
          granted: template.granted,
          grantedAt: new Date(template.grantedAt),
          revokedAt: template.revokedAt === null ? null : new Date(template.revokedAt),
          evidenceRef: template.evidenceRef,
        },
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Audit events — system-driven, no L2 payloads in metadata
  // ---------------------------------------------------------------------------
  console.log('Seed: creating audit events...');

  for (const slug of athleteIdsBySlug.keys()) {
    const aid = athleteId(slug);
    await prisma.auditEvent.create({
      data: {
        actorUserAccountId: systemAccount.id,
        athleteId: aid,
        eventType: 'ATHLETE_PROFILE_CREATED',
        targetType: 'Athlete',
        targetId: aid,
        purposeCode: 'ACCOUNT_PROVISIONING',
        requestId: randomUUID(),
        metadata: { source: 'seed' },
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Data lifecycle requests
  // ---------------------------------------------------------------------------
  console.log('Seed: creating data lifecycle requests...');

  const lifecycleSeeds: ReadonlyArray<{
    readonly athleteSlug: string;
    readonly requestType: DataLifecycleType;
    readonly status: DataLifecycleStatus;
    readonly artifactPath: string | null;
    readonly createdAt: string;
    readonly expiresAt: string | null;
    readonly completedAt: string | null;
  }> = [
    {
      athleteSlug: 'carolina-rios-villegas',
      requestType: DataLifecycleType.EXPORT,
      status: DataLifecycleStatus.COMPLETED,
      artifactPath: 'lifecycle-exports/carolina-rios-villegas/2025-03-export.zip',
      createdAt: '2025-03-01T12:00:00Z',
      expiresAt: '2025-03-08T12:00:00Z',
      completedAt: '2025-03-01T12:04:18Z',
    },
    {
      athleteSlug: 'valentina-hernandez-lozano',
      requestType: DataLifecycleType.RECTIFICATION,
      status: DataLifecycleStatus.IN_PROGRESS,
      artifactPath: null,
      createdAt: '2025-04-22T09:14:00Z',
      expiresAt: null,
      completedAt: null,
    },
    {
      athleteSlug: 'andres-quintero-salazar',
      requestType: DataLifecycleType.DELETION,
      status: DataLifecycleStatus.REQUESTED,
      artifactPath: null,
      createdAt: '2025-05-02T17:45:30Z',
      expiresAt: null,
      completedAt: null,
    },
  ];

  for (const seed of lifecycleSeeds) {
    const aid = athleteId(seed.athleteSlug);
    await prisma.dataLifecycleRequest.create({
      data: {
        athleteId: aid,
        requestedBy: systemAccount.id,
        requestType: seed.requestType,
        status: seed.status,
        artifactPath: seed.artifactPath,
        createdAt: new Date(seed.createdAt),
        expiresAt: seed.expiresAt === null ? null : new Date(seed.expiresAt),
        completedAt: seed.completedAt === null ? null : new Date(seed.completedAt),
      },
    });
  }

  const counts = {
    userAccounts: await prisma.userAccount.count(),
    sports: await prisma.sport.count(),
    athletes: await prisma.athlete.count(),
    publicProfiles: await prisma.athletePublicProfile.count(),
    privateProfiles: await prisma.athletePrivateProfile.count(),
    photoAssets: await prisma.profilePhotoAsset.count(),
    achievements: await prisma.athleteAchievement.count(),
    connections: await prisma.athleteConnection.count(),
    consentLogs: await prisma.piiConsentLog.count(),
    auditEvents: await prisma.auditEvent.count(),
    lifecycleRequests: await prisma.dataLifecycleRequest.count(),
  };
  console.log('Seed: complete. Row counts:', counts);
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
