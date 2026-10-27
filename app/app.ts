// Express app for the target system: login, list/detail pages and JSON API.
import path from 'node:path';
import express, { type Request, type Response, type Router } from 'express';
import { checkCredentials, endSession, requireLogin, sessionUser, startSession } from './auth';
import type { TargetDb } from './db';
import {
  authorisationView,
  bookingView,
  clientView,
  toCells,
  toRows,
  type EntityView,
} from './view-models';

function queryString(req: Request, name: string): string {
  const value = req.query[name];
  return typeof value === 'string' ? value : '';
}

function renderNotFound(res: Response): void {
  res.status(404).render('not-found', { pageTitle: 'Not found' });
}

interface EntitySource<T> {
  list(req: Request): T[];
  get(id: string): T | undefined;
}

/** Mounts GET <basePath> (list) and GET <basePath>/:externalId (detail) pages. */
function mountPages<T extends { externalId: string }>(
  router: Router,
  view: EntityView<T>,
  source: EntitySource<T>,
): void {
  router.get(view.basePath, (req, res) => {
    const q = queryString(req, 'q');
    res.render('list', {
      pageTitle: view.title,
      view,
      columns: Object.values(view.labels),
      rows: toRows(view, source.list(req)),
      search: view.key === 'client' ? { q } : null,
    });
  });

  router.get(`${view.basePath}/:externalId`, (req, res) => {
    const record = source.get(req.params.externalId);
    if (!record) {
      renderNotFound(res);
      return;
    }
    res.render('detail', {
      pageTitle: `${view.singular} ${record.externalId}`,
      view,
      record,
      fields: toCells(view, record),
    });
  });
}

function apiRouter(db: TargetDb): Router {
  const api = express.Router();
  api.get('/clients', (req, res) => {
    res.json(db.listClients(queryString(req, 'q')));
  });
  api.get('/clients/:externalId', (req, res) => {
    const client = db.getClient(req.params.externalId);
    if (!client) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.json(client);
  });
  api.get('/authorisations', (_req, res) => {
    res.json(db.listAuthorisations());
  });
  api.get('/bookings', (_req, res) => {
    res.json(db.listBookings());
  });
  api.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });
  return api;
}

export function createApp(db: TargetDb): express.Express {
  const app = express();
  app.set('views', path.join(import.meta.dirname, 'views'));
  app.set('view engine', 'ejs');
  app.disable('x-powered-by');

  // Public routes.
  app.use(express.static(path.join(import.meta.dirname, 'public')));
  app.get('/favicon.ico', (_req, res) => {
    res.status(204).end();
  });
  app.get('/login', (req, res) => {
    if (sessionUser(req)) {
      res.redirect('/clients');
      return;
    }
    res.render('login', { pageTitle: 'Sign in', error: null, username: '' });
  });
  app.post('/login', express.urlencoded({ extended: false }), (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const username = typeof body.username === 'string' ? body.username : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!checkCredentials(username, password)) {
      res.render('login', {
        pageTitle: 'Sign in',
        error: 'Invalid username or password.',
        username,
      });
      return;
    }
    startSession(res, username);
    res.redirect('/clients');
  });
  app.post('/logout', (_req, res) => {
    endSession(res);
    res.redirect('/login');
  });

  // Everything below needs a valid session.
  app.use(requireLogin);
  app.use('/api', apiRouter(db));

  const pages = express.Router();
  pages.get('/', (_req, res) => {
    res.redirect('/clients');
  });
  mountPages(pages, clientView, {
    list: (req) => db.listClients(queryString(req, 'q')),
    get: (id) => db.getClient(id),
  });
  mountPages(pages, authorisationView, {
    list: () => db.listAuthorisations(),
    get: (id) => db.getAuthorisation(id),
  });
  mountPages(pages, bookingView, {
    list: () => db.listBookings(),
    get: (id) => db.getBooking(id),
  });
  app.use(pages);
  app.use((_req, res) => {
    renderNotFound(res);
  });

  return app;
}
