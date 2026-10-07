/**
 * Seed data — clubs, trainers, metric catalog, memberships, and
 * trainer-reported metric series (ADR-013).
 *
 * Sports and metrics follow what Colombia actually plays and wins at:
 * fútbol and ciclismo lead participation; halterofilia, ciclismo (ruta, pista,
 * BMX), boxeo, and atletismo are the Olympic medal sports; patinaje de
 * velocidad is a world power; béisbol dominates the Caribbean coast; tejo is
 * the national sport (Ley 613 de 2000); fútbol de salón and natación are
 * widely practiced.
 *
 * Metric values sit inside published reference ranges for the athlete's
 * level, for example:
 *   - fútbol: Yo-Yo IR1, 10/30 m sprints, CMJ ≈ 38–50 cm in elite youth
 *   - ruta: FTP ≈ 4.7–5.5 W/kg (domestic pro) to 5.5–6.5 W/kg (WorldTour), VO₂máx 75–85
 *   - BMX: peak sprint power ≈ 1.6–2.1 kW (elite men), lower for women
 *   - patinaje: 200 m meta contra meta, world record ≈ 18.5 s (women)
 *   - boxeo: peak force ≈ 2.3–2.8 kN lead hand, 3.7–4.8 kN rear hand (intermediate → elite)
 *   - béisbol: 88+ mph pitch velocity and sub-6.8 s 60-yard dash for college prospects
 *   - tejo: mano 1, mecha 3, embocinada 6, moñona 9; matches to 27 points
 * Every athlete, club, and trainer here is fictional.
 */
import { ClubMembershipStatus, VisibilityAudience } from '@prisma/client';

export type ClubSeed = {
  readonly slug: string;
  readonly name: string;
  readonly city: string;
  /** Trainer accounts (no athlete profile). Trainer authority = ClubTrainer row. */
  readonly trainerSupabaseUserIds: ReadonlyArray<string>;
};

export const CLUBS: ReadonlyArray<ClubSeed> = [
  {
    slug: 'atletico-nacional-formativas',
    name: 'Atlético Nacional — Divisiones Formativas',
    city: 'Medellín',
    trainerSupabaseUserIds: ['seed-trainer-jhon-arango', 'seed-trainer-diana-velez'],
  },
  {
    slug: 'club-formativo-aburra-sur',
    name: 'Club Formativo Aburrá Sur',
    city: 'Itagüí',
    trainerSupabaseUserIds: ['seed-trainer-hernan-restrepo'],
  },
  {
    slug: 'liga-ciclismo-risaralda-bmx',
    name: 'Liga de Ciclismo de Risaralda — BMX',
    city: 'Pereira',
    trainerSupabaseUserIds: ['seed-trainer-paola-giraldo'],
  },
  {
    slug: 'liga-ciclismo-boyaca',
    name: 'Liga de Ciclismo de Boyacá',
    city: 'Tunja',
    trainerSupabaseUserIds: ['seed-trainer-fabio-camargo', 'seed-trainer-nelson-pinzon'],
  },
  {
    slug: 'liga-patinaje-tolima',
    name: 'Liga Tolimense de Patinaje',
    city: 'Ibagué',
    trainerSupabaseUserIds: ['seed-trainer-adriana-lozano'],
  },
  {
    slug: 'liga-atletismo-atlantico',
    name: 'Liga de Atletismo del Atlántico',
    city: 'Barranquilla',
    trainerSupabaseUserIds: ['seed-trainer-luz-marina-orozco'],
  },
  {
    slug: 'liga-pesas-bogota',
    name: 'Liga de Levantamiento de Pesas de Bogotá',
    city: 'Bogotá',
    trainerSupabaseUserIds: ['seed-trainer-oscar-mosquera', 'seed-trainer-yesenia-renteria'],
  },
  {
    slug: 'liga-boxeo-valle',
    name: 'Liga Vallecaucana de Boxeo',
    city: 'Cali',
    trainerSupabaseUserIds: ['seed-trainer-rafael-angulo'],
  },
  {
    slug: 'club-boxeo-pascual-guerrero',
    name: 'Club de Boxeo Pascual Guerrero',
    city: 'Cali',
    trainerSupabaseUserIds: ['seed-trainer-wilmer-caicedo'],
  },
  {
    slug: 'liga-beisbol-bolivar',
    name: 'Liga de Béisbol de Bolívar',
    city: 'Cartagena',
    trainerSupabaseUserIds: ['seed-trainer-alfredo-julio', 'seed-trainer-edgar-barrios'],
  },
  {
    slug: 'liga-voleibol-valle',
    name: 'Liga Vallecaucana de Voleibol',
    city: 'Cali',
    trainerSupabaseUserIds: ['seed-trainer-claudia-viveros'],
  },
  {
    slug: 'liga-baloncesto-santander',
    name: 'Liga Santandereana de Baloncesto',
    city: 'Bucaramanga',
    trainerSupabaseUserIds: ['seed-trainer-mauricio-ardila'],
  },
  {
    slug: 'liga-tejo-boyaca',
    name: 'Liga Boyacense de Tejo',
    city: 'Turmequé',
    trainerSupabaseUserIds: ['seed-trainer-gustavo-sierra'],
  },
  {
    slug: 'liga-natacion-antioquia',
    name: 'Liga Antioqueña de Natación',
    city: 'Medellín',
    trainerSupabaseUserIds: ['seed-trainer-catalina-uribe'],
  },
  {
    slug: 'liga-natacion-valle',
    name: 'Liga Vallecaucana de Natación',
    city: 'Cali',
    trainerSupabaseUserIds: ['seed-trainer-jorge-cuero'],
  },
  {
    slug: 'liga-futbol-salon-bogota',
    name: 'Liga de Fútbol de Salón de Bogotá',
    city: 'Bogotá',
    trainerSupabaseUserIds: ['seed-trainer-natalia-forero'],
  },
];

export type MetricSeed = {
  readonly key: string;
  readonly name: string;
  readonly unit: string;
  /** null = applies to every sport. */
  readonly sportName: string | null;
  readonly isActive?: boolean;
};

export const METRICS: ReadonlyArray<MetricSeed> = [
  // General (any sport)
  { key: 'vertical_jump', name: 'Salto vertical (CMJ)', unit: 'cm', sportName: null },
  {
    key: 'resting_heart_rate',
    name: 'Frecuencia cardíaca en reposo',
    unit: 'lpm',
    sportName: null,
  },
  { key: 'vo2max', name: 'VO₂ máx', unit: 'ml/kg/min', sportName: null },
  { key: 'body_mass', name: 'Masa corporal', unit: 'kg', sportName: null },
  { key: 'body_fat_pct', name: 'Porcentaje de grasa corporal', unit: '%', sportName: null },
  {
    key: 'yo_yo_ir1_distance',
    name: 'Yo-Yo Intermittent Recovery Nivel 1',
    unit: 'm',
    sportName: null,
  },
  // Retired from the battery; kept so historical entries stay meaningful.
  {
    key: 'course_navette_level',
    name: 'Course Navette (retirada)',
    unit: 'nivel',
    sportName: null,
    isActive: false,
  },

  // Fútbol
  { key: 'sprint_10m', name: 'Sprint 10 m', unit: 's', sportName: 'Fútbol' },
  { key: 'sprint_30m', name: 'Sprint 30 m', unit: 's', sportName: 'Fútbol' },
  {
    key: 'rsa_mean_time',
    name: 'Sprints repetidos 6×30 m — tiempo medio',
    unit: 's',
    sportName: 'Fútbol',
  },
  {
    key: 'match_distance_covered',
    name: 'Distancia total por partido (GPS)',
    unit: 'km',
    sportName: 'Fútbol',
  },
  {
    key: 'high_speed_running_distance',
    name: 'Distancia a alta velocidad (>19,8 km/h)',
    unit: 'm',
    sportName: 'Fútbol',
  },

  // Ciclismo de Ruta
  { key: 'ftp_w_per_kg', name: 'FTP relativo', unit: 'W/kg', sportName: 'Ciclismo de Ruta' },
  { key: 'ftp_watts', name: 'FTP absoluto', unit: 'W', sportName: 'Ciclismo de Ruta' },
  {
    key: 'power_5min_w_per_kg',
    name: 'Potencia máxima 5 min',
    unit: 'W/kg',
    sportName: 'Ciclismo de Ruta',
  },

  // Ciclismo BMX
  { key: 'bmx_lap_time', name: 'Tiempo de vuelta BMX', unit: 's', sportName: 'Ciclismo BMX' },
  {
    key: 'bmx_gate_start_5m',
    name: 'Partida desde rampa — primeros 5 m',
    unit: 's',
    sportName: 'Ciclismo BMX',
  },
  { key: 'bmx_peak_power', name: 'Potencia pico de sprint', unit: 'W', sportName: 'Ciclismo BMX' },

  // Patinaje de Velocidad
  {
    key: 'skating_200m_time_trial',
    name: '200 m contrarreloj (meta contra meta)',
    unit: 's',
    sportName: 'Patinaje de Velocidad',
  },
  {
    key: 'skating_500m_sprint',
    name: '500 m sprint',
    unit: 's',
    sportName: 'Patinaje de Velocidad',
  },
  { key: 'skating_1000m', name: '1.000 m', unit: 's', sportName: 'Patinaje de Velocidad' },

  // Atletismo
  { key: 'sprint_100m', name: '100 m planos', unit: 's', sportName: 'Atletismo' },
  { key: 'run_400m', name: '400 m planos', unit: 's', sportName: 'Atletismo' },
  { key: 'run_400m_hurdles', name: '400 m con vallas', unit: 's', sportName: 'Atletismo' },
  { key: 'triple_jump', name: 'Salto triple', unit: 'm', sportName: 'Atletismo' },

  // Levantamiento de Pesas
  { key: 'snatch_max', name: 'Arranque máximo', unit: 'kg', sportName: 'Levantamiento de Pesas' },
  {
    key: 'clean_and_jerk_max',
    name: 'Envión máximo',
    unit: 'kg',
    sportName: 'Levantamiento de Pesas',
  },
  {
    key: 'weightlifting_total',
    name: 'Total olímpico (arranque + envión)',
    unit: 'kg',
    sportName: 'Levantamiento de Pesas',
  },

  // Boxeo
  { key: 'punch_rate', name: 'Golpes por minuto (saco)', unit: 'golpes/min', sportName: 'Boxeo' },
  {
    key: 'rear_cross_peak_force',
    name: 'Fuerza pico — recto de atrás',
    unit: 'N',
    sportName: 'Boxeo',
  },
  { key: 'lead_jab_peak_force', name: 'Fuerza pico — jab', unit: 'N', sportName: 'Boxeo' },

  // Béisbol
  {
    key: 'pitch_velocity_max',
    name: 'Velocidad máxima de lanzamiento',
    unit: 'mph',
    sportName: 'Béisbol',
  },
  {
    key: 'fastball_spin_rate',
    name: 'Tasa de giro de la recta',
    unit: 'rpm',
    sportName: 'Béisbol',
  },
  {
    key: 'exit_velocity_max',
    name: 'Velocidad de salida del bate',
    unit: 'mph',
    sportName: 'Béisbol',
  },
  { key: 'sixty_yard_dash', name: 'Carrera de 60 yardas', unit: 's', sportName: 'Béisbol' },
  { key: 'catcher_pop_time', name: 'Pop time del receptor', unit: 's', sportName: 'Béisbol' },

  // Baloncesto
  { key: 'lane_agility', name: 'Agilidad en la pintura', unit: 's', sportName: 'Baloncesto' },
  {
    key: 'free_throw_pct',
    name: 'Efectividad en tiros libres',
    unit: '%',
    sportName: 'Baloncesto',
  },
  {
    key: 'basketball_points_per_game',
    name: 'Puntos por partido',
    unit: 'pts',
    sportName: 'Baloncesto',
  },

  // Voleibol
  { key: 'spike_reach', name: 'Alcance de ataque', unit: 'cm', sportName: 'Voleibol' },
  { key: 'block_reach', name: 'Alcance de bloqueo', unit: 'cm', sportName: 'Voleibol' },
  {
    key: 'volleyball_serve_speed',
    name: 'Velocidad de saque en salto',
    unit: 'km/h',
    sportName: 'Voleibol',
  },

  // Fútbol de Salón
  { key: 'futsal_sprint_20m', name: 'Sprint 20 m', unit: 's', sportName: 'Fútbol de Salón' },
  {
    key: 'futsal_goals_per_match',
    name: 'Goles por partido',
    unit: 'goles',
    sportName: 'Fútbol de Salón',
  },

  // Tejo
  {
    key: 'tejo_points_per_match',
    name: 'Puntos por partido (a 27)',
    unit: 'puntos',
    sportName: 'Tejo',
  },
  { key: 'tejo_mecha_rate', name: 'Efectividad de mecha', unit: '%', sportName: 'Tejo' },
  {
    key: 'tejo_embocinadas_per_match',
    name: 'Embocinadas por partido',
    unit: 'embocinadas',
    sportName: 'Tejo',
  },

  // Natación
  {
    key: 'swim_50m_freestyle',
    name: '50 m libre (piscina larga)',
    unit: 's',
    sportName: 'Natación',
  },
  {
    key: 'swim_100m_freestyle',
    name: '100 m libre (piscina larga)',
    unit: 's',
    sportName: 'Natación',
  },

  // Tenis
  {
    key: 'tennis_first_serve_speed',
    name: 'Velocidad del primer servicio',
    unit: 'km/h',
    sportName: 'Tenis',
  },
  {
    key: 'tennis_first_serve_pct',
    name: 'Porcentaje de primeros servicios',
    unit: '%',
    sportName: 'Tenis',
  },
];

/** One metric measured over time; dates are YYYY-MM-DD (recorded at 14:00 UTC). */
export type MetricSeries = {
  readonly metricKey: string;
  /** Index into the club's trainers; defaults to the first trainer. */
  readonly trainer?: number;
  readonly points: ReadonlyArray<readonly [date: string, value: number]>;
};

export type MembershipSeed = {
  readonly athleteSlug: string;
  readonly clubSlug: string;
  readonly status: ClubMembershipStatus;
  readonly invitedAt: string;
  readonly respondedAt: string | null;
  readonly endedAt: string | null;
  /** Must fall within [respondedAt, endedAt ?? now]: the DB trigger only accepts entries for ACTIVE memberships. */
  readonly series: ReadonlyArray<MetricSeries>;
};

export const MEMBERSHIPS: ReadonlyArray<MembershipSeed> = [
  // ── Daniel Mendoza — Fútbol, mediocampista. Earlier academy (COMPLETED), now Nacional (ACTIVE).
  {
    athleteSlug: 'daniel-mendoza-restrepo',
    clubSlug: 'club-formativo-aburra-sur',
    status: ClubMembershipStatus.COMPLETED,
    invitedAt: '2022-02-14T13:00:00Z',
    respondedAt: '2022-02-15T09:00:00Z',
    endedAt: '2024-12-20T17:00:00Z',
    series: [
      {
        metricKey: 'sprint_30m',
        points: [
          ['2022-04-11', 4.32],
          ['2023-03-13', 4.25],
          ['2024-03-11', 4.19],
        ],
      },
      {
        metricKey: 'yo_yo_ir1_distance',
        points: [
          ['2022-04-11', 1880],
          ['2023-03-13', 2040],
          ['2024-03-11', 2200],
        ],
      },
      {
        metricKey: 'vertical_jump',
        points: [
          ['2022-04-12', 47.0],
          ['2023-03-14', 49.5],
          ['2024-03-12', 51.0],
        ],
      },
    ],
  },
  {
    athleteSlug: 'daniel-mendoza-restrepo',
    clubSlug: 'atletico-nacional-formativas',
    status: ClubMembershipStatus.ACTIVE,
    invitedAt: '2025-01-13T14:00:00Z',
    respondedAt: '2025-01-14T09:20:00Z',
    endedAt: null,
    series: [
      {
        metricKey: 'sprint_10m',
        points: [
          ['2025-02-10', 1.74],
          ['2025-08-11', 1.71],
          ['2026-02-09', 1.69],
        ],
      },
      {
        metricKey: 'sprint_30m',
        points: [
          ['2025-02-10', 4.16],
          ['2025-08-11', 4.12],
          ['2026-02-09', 4.1],
        ],
      },
      {
        metricKey: 'rsa_mean_time',
        trainer: 1,
        points: [
          ['2025-02-12', 4.62],
          ['2025-08-13', 4.57],
          ['2026-02-11', 4.53],
        ],
      },
      {
        metricKey: 'yo_yo_ir1_distance',
        trainer: 1,
        points: [
          ['2025-02-12', 2280],
          ['2025-08-13', 2440],
          ['2026-02-11', 2520],
        ],
      },
      {
        metricKey: 'vertical_jump',
        points: [
          ['2025-02-10', 52.5],
          ['2026-02-09', 53.8],
        ],
      },
      {
        metricKey: 'match_distance_covered',
        trainer: 1,
        points: [
          ['2025-09-20', 10.8],
          ['2026-03-14', 11.4],
          ['2026-08-22', 11.6],
        ],
      },
      {
        metricKey: 'high_speed_running_distance',
        trainer: 1,
        points: [
          ['2025-09-20', 640],
          ['2026-03-14', 710],
          ['2026-08-22', 735],
        ],
      },
      {
        metricKey: 'vo2max',
        points: [
          ['2025-02-12', 58.4],
          ['2026-02-11', 60.1],
        ],
      },
      {
        metricKey: 'body_fat_pct',
        points: [
          ['2025-02-10', 9.8],
          ['2025-08-11', 9.3],
          ['2026-02-09', 9.1],
        ],
      },
    ],
  },

  // ── Carolina Ríos — Ciclismo BMX, élite.
  {
    athleteSlug: 'carolina-rios-villegas',
    clubSlug: 'liga-ciclismo-risaralda-bmx',
    status: ClubMembershipStatus.ACTIVE,
    invitedAt: '2024-11-04T13:00:00Z',
    respondedAt: '2024-11-04T18:45:00Z',
    endedAt: null,
    series: [
      {
        metricKey: 'bmx_lap_time',
        points: [
          ['2025-03-08', 34.87],
          ['2025-06-21', 34.52],
          ['2026-01-24', 34.18],
          ['2026-07-18', 33.95],
        ],
      },
      {
        metricKey: 'bmx_gate_start_5m',
        points: [
          ['2025-03-08', 1.42],
          ['2025-06-21', 1.4],
          ['2026-01-24', 1.38],
          ['2026-07-18', 1.37],
        ],
      },
      {
        metricKey: 'bmx_peak_power',
        points: [
          ['2025-03-09', 1180],
          ['2025-06-22', 1205],
          ['2026-01-25', 1240],
          ['2026-07-19', 1262],
        ],
      },
      {
        metricKey: 'resting_heart_rate',
        points: [
          ['2025-06-21', 48],
          ['2026-07-18', 47],
        ],
      },
      {
        metricKey: 'body_mass',
        points: [
          ['2025-03-08', 62.4],
          ['2026-07-18', 61.9],
        ],
      },
    ],
  },

  // ── Sebastián Cárdenas — Boxeo welter. Liga (COMPLETED), new club invitation pending.
  {
    athleteSlug: 'sebastian-cardenas-aristizabal',
    clubSlug: 'liga-boxeo-valle',
    status: ClubMembershipStatus.COMPLETED,
    invitedAt: '2022-01-18T15:00:00Z',
    respondedAt: '2022-01-20T10:00:00Z',
    endedAt: '2024-12-15T18:00:00Z',
    series: [
      {
        metricKey: 'punch_rate',
        points: [
          ['2022-06-06', 92],
          ['2023-05-08', 101],
          ['2024-05-06', 108],
        ],
      },
      {
        metricKey: 'rear_cross_peak_force',
        points: [
          ['2022-06-07', 3450],
          ['2023-05-09', 3820],
          ['2024-05-07', 4100],
        ],
      },
      {
        metricKey: 'lead_jab_peak_force',
        points: [
          ['2022-06-07', 2050],
          ['2023-05-09', 2240],
          ['2024-05-07', 2380],
        ],
      },
      {
        metricKey: 'vo2max',
        points: [
          ['2023-05-10', 55.2],
          ['2024-05-08', 57.0],
        ],
      },
      {
        metricKey: 'body_mass',
        points: [
          ['2022-06-06', 66.8],
          ['2023-05-08', 66.5],
          ['2024-05-06', 66.9],
        ],
      },
    ],
  },
  {
    athleteSlug: 'sebastian-cardenas-aristizabal',
    clubSlug: 'club-boxeo-pascual-guerrero',
    status: ClubMembershipStatus.PENDING_ATHLETE_CONFIRMATION,
    invitedAt: '2025-07-01T16:10:00Z',
    respondedAt: null,
    endedAt: null,
    series: [],
  },

  // ── Valentina Hernández — 400 m vallas. Liga (COMPLETED); declined a weightlifting invitation.
  {
    athleteSlug: 'valentina-hernandez-lozano',
    clubSlug: 'liga-atletismo-atlantico',
    status: ClubMembershipStatus.COMPLETED,
    invitedAt: '2023-02-06T12:00:00Z',
    respondedAt: '2023-02-07T08:00:00Z',
    endedAt: '2025-01-31T17:00:00Z',
    series: [
      {
        metricKey: 'run_400m_hurdles',
        points: [
          ['2023-04-15', 58.92],
          ['2023-09-15', 58.1],
          ['2024-05-18', 57.45],
          ['2024-08-20', 57.12],
        ],
      },
      {
        metricKey: 'run_400m',
        points: [
          ['2023-06-10', 54.3],
          ['2024-06-08', 53.71],
        ],
      },
      {
        metricKey: 'sprint_100m',
        points: [
          ['2023-06-10', 12.18],
          ['2024-06-08', 12.05],
        ],
      },
      {
        metricKey: 'vertical_jump',
        points: [
          ['2023-04-14', 44.0],
          ['2024-05-17', 45.5],
        ],
      },
    ],
  },
  {
    athleteSlug: 'valentina-hernandez-lozano',
    clubSlug: 'liga-pesas-bogota',
    status: ClubMembershipStatus.REJECTED,
    invitedAt: '2025-03-03T15:00:00Z',
    respondedAt: '2025-03-05T11:30:00Z',
    endedAt: null,
    series: [],
  },

  // ── Andrés Quintero — Pesas 89 kg.
  {
    athleteSlug: 'andres-quintero-salazar',
    clubSlug: 'liga-pesas-bogota',
    status: ClubMembershipStatus.ACTIVE,
    invitedAt: '2024-06-10T14:00:00Z',
    respondedAt: '2024-06-11T10:00:00Z',
    endedAt: null,
    series: [
      {
        metricKey: 'snatch_max',
        points: [
          ['2024-09-14', 142],
          ['2025-04-02', 145],
          ['2025-11-08', 148],
          ['2026-06-13', 151],
        ],
      },
      {
        metricKey: 'clean_and_jerk_max',
        trainer: 1,
        points: [
          ['2024-09-14', 175],
          ['2025-04-02', 178],
          ['2025-11-08', 182],
          ['2026-06-13', 186],
        ],
      },
      {
        metricKey: 'weightlifting_total',
        points: [
          ['2024-09-14', 317],
          ['2025-04-02', 323],
          ['2025-11-08', 330],
          ['2026-06-13', 337],
        ],
      },
      {
        metricKey: 'body_mass',
        trainer: 1,
        points: [
          ['2024-09-13', 88.6],
          ['2025-04-01', 88.9],
          ['2025-11-07', 88.4],
          ['2026-06-12', 88.8],
        ],
      },
    ],
  },

  // ── Juan Esteban Moreno — Ciclismo de Ruta, escalador boyacense.
  {
    athleteSlug: 'juan-esteban-moreno-patino',
    clubSlug: 'liga-ciclismo-boyaca',
    status: ClubMembershipStatus.ACTIVE,
    invitedAt: '2024-02-02T12:00:00Z',
    respondedAt: '2024-02-05T08:30:00Z',
    endedAt: null,
    series: [
      {
        metricKey: 'ftp_w_per_kg',
        points: [
          ['2024-03-18', 5.1],
          ['2024-09-16', 5.3],
          ['2025-03-17', 5.5],
          ['2025-09-15', 5.6],
          ['2026-04-13', 5.7],
        ],
      },
      {
        metricKey: 'ftp_watts',
        points: [
          ['2024-03-18', 301],
          ['2024-09-16', 310],
          ['2025-03-17', 319],
          ['2025-09-15', 322],
          ['2026-04-13', 325],
        ],
      },
      {
        metricKey: 'power_5min_w_per_kg',
        trainer: 1,
        points: [
          ['2024-03-19', 6.2],
          ['2024-09-17', 6.4],
          ['2025-03-18', 6.6],
          ['2025-09-16', 6.7],
          ['2026-04-14', 6.9],
        ],
      },
      {
        metricKey: 'vo2max',
        trainer: 1,
        points: [
          ['2024-03-20', 76.5],
          ['2025-03-19', 78.9],
          ['2026-04-15', 80.2],
        ],
      },
      {
        metricKey: 'body_mass',
        points: [
          ['2024-03-18', 59.0],
          ['2024-09-16', 58.4],
          ['2025-03-17', 58.0],
          ['2025-09-15', 57.4],
          ['2026-04-13', 57.0],
        ],
      },
      {
        metricKey: 'resting_heart_rate',
        points: [
          ['2024-03-18', 44],
          ['2025-03-17', 42],
          ['2026-04-13', 41],
        ],
      },
    ],
  },

  // ── Laura Gómez — Patinaje de Velocidad, velocista.
  {
    athleteSlug: 'laura-sofia-gomez-ospina',
    clubSlug: 'liga-patinaje-tolima',
    status: ClubMembershipStatus.ACTIVE,
    invitedAt: '2023-07-28T14:00:00Z',
    respondedAt: '2023-08-01T09:00:00Z',
    endedAt: null,
    series: [
      {
        metricKey: 'skating_200m_time_trial',
        points: [
          ['2023-10-14', 19.42],
          ['2024-04-13', 19.18],
          ['2024-10-12', 18.96],
          ['2025-05-10', 18.84],
          ['2026-03-14', 18.79],
        ],
      },
      {
        metricKey: 'skating_500m_sprint',
        points: [
          ['2023-10-14', 44.1],
          ['2024-04-13', 43.62],
          ['2025-05-10', 43.2],
          ['2026-03-14', 42.95],
        ],
      },
      {
        metricKey: 'skating_1000m',
        points: [
          ['2024-04-14', 88.4],
          ['2025-05-11', 87.6],
          ['2026-03-15', 86.9],
        ],
      },
      {
        metricKey: 'vertical_jump',
        points: [
          ['2023-10-13', 41.0],
          ['2024-10-11', 42.5],
          ['2026-03-13', 43.2],
        ],
      },
      {
        metricKey: 'body_fat_pct',
        points: [
          ['2024-04-13', 16.2],
          ['2026-03-14', 15.4],
        ],
      },
    ],
  },

  // ── Kevin Palacios — Béisbol, lanzador derecho (prospecto).
  {
    athleteSlug: 'kevin-andres-palacios-mosquera',
    clubSlug: 'liga-beisbol-bolivar',
    status: ClubMembershipStatus.ACTIVE,
    invitedAt: '2024-01-12T15:00:00Z',
    respondedAt: '2024-01-15T10:00:00Z',
    endedAt: null,
    series: [
      {
        metricKey: 'pitch_velocity_max',
        points: [
          ['2024-02-19', 84],
          ['2024-08-19', 86],
          ['2025-02-17', 88],
          ['2025-08-18', 90],
          ['2026-03-16', 91],
        ],
      },
      {
        metricKey: 'fastball_spin_rate',
        trainer: 1,
        points: [
          ['2024-08-19', 2180],
          ['2025-08-18', 2240],
          ['2026-03-16', 2290],
        ],
      },
      {
        metricKey: 'sixty_yard_dash',
        trainer: 1,
        points: [
          ['2024-02-20', 7.15],
          ['2025-02-18', 7.05],
          ['2026-03-17', 6.98],
        ],
      },
      {
        metricKey: 'body_mass',
        points: [
          ['2024-02-19', 79.5],
          ['2025-02-17', 82.0],
          ['2026-03-16', 84.3],
        ],
      },
    ],
  },

  // ── María José Benavides — Voleibol, opuesta.
  {
    athleteSlug: 'maria-jose-benavides-ortiz',
    clubSlug: 'liga-voleibol-valle',
    status: ClubMembershipStatus.ACTIVE,
    invitedAt: '2024-03-08T13:00:00Z',
    respondedAt: '2024-03-10T09:00:00Z',
    endedAt: null,
    series: [
      {
        metricKey: 'spike_reach',
        points: [
          ['2024-04-15', 296],
          ['2024-10-14', 299],
          ['2025-05-12', 302],
          ['2026-02-16', 304],
        ],
      },
      {
        metricKey: 'block_reach',
        points: [
          ['2024-04-15', 282],
          ['2024-10-14', 285],
          ['2025-05-12', 287],
          ['2026-02-16', 289],
        ],
      },
      {
        metricKey: 'volleyball_serve_speed',
        points: [
          ['2024-10-15', 68],
          ['2025-05-13', 71],
          ['2026-02-17', 74],
        ],
      },
      {
        metricKey: 'vertical_jump',
        points: [
          ['2024-04-15', 51.0],
          ['2025-05-12', 53.2],
          ['2026-02-16', 54.0],
        ],
      },
    ],
  },

  // ── Santiago Rueda — Baloncesto, base.
  {
    athleteSlug: 'santiago-rueda-navarro',
    clubSlug: 'liga-baloncesto-santander',
    status: ClubMembershipStatus.ACTIVE,
    invitedAt: '2024-07-18T16:00:00Z',
    respondedAt: '2024-07-20T11:00:00Z',
    endedAt: null,
    series: [
      {
        metricKey: 'lane_agility',
        points: [
          ['2024-08-12', 11.42],
          ['2025-02-10', 11.18],
          ['2026-02-09', 10.96],
        ],
      },
      {
        metricKey: 'vertical_jump',
        points: [
          ['2024-08-12', 62.0],
          ['2025-02-10', 64.5],
          ['2026-02-09', 66.0],
        ],
      },
      {
        metricKey: 'free_throw_pct',
        points: [
          ['2024-12-14', 71.4],
          ['2025-12-13', 76.8],
          ['2026-07-11', 79.2],
        ],
      },
      {
        metricKey: 'basketball_points_per_game',
        points: [
          ['2024-12-14', 12.6],
          ['2025-12-13', 15.1],
          ['2026-07-11', 17.8],
        ],
      },
    ],
  },

  // ── Camilo Bautista — Tejo.
  {
    athleteSlug: 'camilo-andres-bautista-rojas',
    clubSlug: 'liga-tejo-boyaca',
    status: ClubMembershipStatus.ACTIVE,
    invitedAt: '2023-02-27T14:00:00Z',
    respondedAt: '2023-03-01T08:00:00Z',
    endedAt: null,
    series: [
      {
        metricKey: 'tejo_points_per_match',
        points: [
          ['2023-06-17', 19.5],
          ['2024-03-16', 21.8],
          ['2024-11-16', 23.4],
          ['2025-08-16', 24.1],
        ],
      },
      {
        metricKey: 'tejo_mecha_rate',
        points: [
          ['2023-06-17', 28],
          ['2024-03-16', 33],
          ['2024-11-16', 36],
          ['2025-08-16', 38],
        ],
      },
      {
        metricKey: 'tejo_embocinadas_per_match',
        points: [
          ['2023-06-17', 1.2],
          ['2024-03-16', 1.6],
          ['2024-11-16', 1.9],
          ['2025-08-16', 2.1],
        ],
      },
    ],
  },

  // ── Isabella Quintana — Natación, velocista de crol. Declined a move to Valle.
  {
    athleteSlug: 'isabella-quintana-zapata',
    clubSlug: 'liga-natacion-antioquia',
    status: ClubMembershipStatus.ACTIVE,
    invitedAt: '2024-01-17T13:00:00Z',
    respondedAt: '2024-01-20T10:00:00Z',
    endedAt: null,
    series: [
      {
        metricKey: 'swim_50m_freestyle',
        points: [
          ['2024-03-23', 26.84],
          ['2024-09-21', 26.41],
          ['2025-04-26', 26.02],
          ['2026-02-21', 25.77],
        ],
      },
      {
        metricKey: 'swim_100m_freestyle',
        points: [
          ['2024-03-24', 58.36],
          ['2024-09-22', 57.7],
          ['2025-04-27', 56.98],
          ['2026-02-22', 56.41],
        ],
      },
      {
        metricKey: 'vo2max',
        points: [
          ['2024-03-20', 52.1],
          ['2025-04-23', 54.0],
        ],
      },
    ],
  },
  {
    athleteSlug: 'isabella-quintana-zapata',
    clubSlug: 'liga-natacion-valle',
    status: ClubMembershipStatus.REJECTED,
    invitedAt: '2025-06-09T15:00:00Z',
    respondedAt: '2025-06-12T19:00:00Z',
    endedAt: null,
    series: [],
  },

  // ── Daniela Cortés — Fútbol de Salón, ala.
  {
    athleteSlug: 'daniela-cortes-valencia',
    clubSlug: 'liga-futbol-salon-bogota',
    status: ClubMembershipStatus.ACTIVE,
    invitedAt: '2025-01-29T14:00:00Z',
    respondedAt: '2025-02-01T09:00:00Z',
    endedAt: null,
    series: [
      {
        metricKey: 'futsal_sprint_20m',
        points: [
          ['2025-03-10', 3.32],
          ['2025-09-08', 3.27],
          ['2026-04-06', 3.22],
        ],
      },
      {
        metricKey: 'futsal_goals_per_match',
        points: [
          ['2025-06-28', 0.6],
          ['2025-12-13', 0.9],
          ['2026-06-27', 1.1],
        ],
      },
      {
        metricKey: 'yo_yo_ir1_distance',
        points: [
          ['2025-03-10', 1360],
          ['2025-09-08', 1520],
          ['2026-04-06', 1600],
        ],
      },
    ],
  },
];

// A missing row means each category's default (PRIVATE for club memberships and
// metrics, PUBLIC for achievements — ADR-014); Valentina and Daniela deliberately have none.
export const VISIBILITY: ReadonlyArray<{
  readonly athleteSlug: string;
  readonly clubMembershipsAudience: VisibilityAudience;
  readonly metricsAudience: VisibilityAudience;
  readonly achievementsAudience: VisibilityAudience;
}> = [
  {
    athleteSlug: 'daniel-mendoza-restrepo',
    clubMembershipsAudience: VisibilityAudience.PUBLIC,
    metricsAudience: VisibilityAudience.PUBLIC,
    achievementsAudience: VisibilityAudience.PUBLIC,
  },
  {
    athleteSlug: 'carolina-rios-villegas',
    clubMembershipsAudience: VisibilityAudience.PUBLIC,
    metricsAudience: VisibilityAudience.CONNECTIONS,
    achievementsAudience: VisibilityAudience.PUBLIC,
  },
  {
    athleteSlug: 'sebastian-cardenas-aristizabal',
    clubMembershipsAudience: VisibilityAudience.CONNECTIONS,
    metricsAudience: VisibilityAudience.PRIVATE,
    achievementsAudience: VisibilityAudience.CONNECTIONS,
  },
  {
    athleteSlug: 'andres-quintero-salazar',
    clubMembershipsAudience: VisibilityAudience.PRIVATE,
    metricsAudience: VisibilityAudience.PRIVATE,
    achievementsAudience: VisibilityAudience.PRIVATE,
  },
  {
    athleteSlug: 'juan-esteban-moreno-patino',
    clubMembershipsAudience: VisibilityAudience.PUBLIC,
    metricsAudience: VisibilityAudience.PUBLIC,
    achievementsAudience: VisibilityAudience.PUBLIC,
  },
  {
    athleteSlug: 'laura-sofia-gomez-ospina',
    clubMembershipsAudience: VisibilityAudience.PUBLIC,
    metricsAudience: VisibilityAudience.PUBLIC,
    achievementsAudience: VisibilityAudience.PUBLIC,
  },
  {
    athleteSlug: 'kevin-andres-palacios-mosquera',
    clubMembershipsAudience: VisibilityAudience.PUBLIC,
    metricsAudience: VisibilityAudience.CONNECTIONS,
    achievementsAudience: VisibilityAudience.PUBLIC,
  },
  {
    athleteSlug: 'maria-jose-benavides-ortiz',
    clubMembershipsAudience: VisibilityAudience.CONNECTIONS,
    metricsAudience: VisibilityAudience.CONNECTIONS,
    achievementsAudience: VisibilityAudience.CONNECTIONS,
  },
  {
    athleteSlug: 'santiago-rueda-navarro',
    clubMembershipsAudience: VisibilityAudience.PUBLIC,
    metricsAudience: VisibilityAudience.PUBLIC,
    achievementsAudience: VisibilityAudience.PUBLIC,
  },
  {
    athleteSlug: 'camilo-andres-bautista-rojas',
    clubMembershipsAudience: VisibilityAudience.PUBLIC,
    metricsAudience: VisibilityAudience.PUBLIC,
    achievementsAudience: VisibilityAudience.PUBLIC,
  },
  {
    athleteSlug: 'isabella-quintana-zapata',
    clubMembershipsAudience: VisibilityAudience.PUBLIC,
    metricsAudience: VisibilityAudience.CONNECTIONS,
    achievementsAudience: VisibilityAudience.PUBLIC,
  },
];
