#!/usr/bin/env python
# -*- coding: utf-8 -*-
import os
from django.contrib.auth.models import AnonymousUser, User
from django.test import TestCase
from miller import helpers
from miller.models import Document


dir_path = os.path.dirname(os.path.realpath(__file__))

# python manage.py test miller.test.test_models_document.DocumentTest
class DocumentTest(TestCase):

  def setUp(self):
    self.user = User.objects.create_user(
        username='test-user-profile', 
        email='jacob@jacob', 
        password='top_secret')
    

  def _test_create(self):
    self.doc = Document(
        title=u'The happy story of the Promo', 
        url='http://ec.europa.eu/health/files/eudralex/vol-1/reg_2016_161/reg_2016_161_en.pdf',
        owner=self.user
    )
    self.doc.save()
    self.assertEqual(self.doc.slug, 'the-happy-story-of-the-promo')
    self.assertEqual(self.doc.locked, False)
    
  def _test_fill_metadata(self):
    self.doc.fill_from_url()
    self.assertEqual('application/pdf', self.doc.mimetype)
    self.doc.create_snapshot()
    self.assertTrue(os.path.exists(self.doc.attachment.path)) # and should have a valid attachment
    

  def _test_create_duplicated_url(self): 
    _doc = Document(
        title=u'The happy story of the Promo', 
        url='http://ec.europa.eu/health/files/eudralex/vol-1/reg_2016_161/reg_2016_161_en.pdf',
        owner=self.user,
        contents='new content here'
    )
    _doc.save()
    self.assertEqual(_doc.pk, self.doc.pk)
    # but content has changed since ...
    self.assertEqual(_doc.contents, self.doc.contents)
    # lock doc
    self.doc.locked = True
    self.doc.save()

    __doc = Document(
        title=u'The happy story of the Promo', 
        url='http://ec.europa.eu/health/files/eudralex/vol-1/reg_2016_161/reg_2016_161_en.pdf',
        owner=self.user,
        contents='very new content here'
    )
    __doc.save()
    self.assertEqual(__doc.pk, self.doc.pk)
    self.assertEqual(self.doc.contents, _doc.contents)
    # the id shouldbe equal to the doc id
    print 'and that\'s it!'



  #@todo check if shapshot and attachments have been deteted
  def _test_delete(self):
    self.doc.delete()
    # self.assertFalse(os.path.exists(path))

    
  def _test_delete_user(self):
    path = self.user.profile.get_path()
    self.user.delete()
    self.assertFalse(os.path.exists(path))
   
    
  def test_suite(self):
    self._test_create()
    self._test_fill_metadata()
    self._test_create_duplicated_url()
    self._test_delete();
    self._test_delete_user()