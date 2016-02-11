from copy import deepcopy
import re
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.conf import settings
from django.db.models import Q
from django.core.files.uploadedfile import InMemoryUploadedFile, UploadedFile
from django.core.files.base import ContentFile
from django.http import JsonResponse, HttpResponseNotFound
from django.conf import settings
from django.db import connection
from django.core.urlresolvers import reverse
from data_upload.models import UserUpload, UserUploadedFile
from projects.models import User_Feature_Definitions, User_Feature_Counts, Project
from accounts.models import GoogleProject,Bucket
from sharing.service import create_share
from google.appengine.api.mail import send_mail

import sys
import json
import requests
import urllib
import httplib

@login_required
def public_project_list(request):
    return project_list(request, is_public=True)

@login_required
def project_list(request, is_public=False):
    template = 'projects/project_list.html'

    ownedProjects = request.user.project_set.all().filter(active=True)
    sharedProjects = Project.objects.filter(shared__matched_user=request.user, shared__active=True, active=True)

    projects = ownedProjects | sharedProjects
    projects = projects.distinct()

    context = {
        'projects' : projects,
        'public_projects' : Project.objects.all().filter(is_public=True,active=True),
        'is_public' : is_public
    }
    return render(request, template, context)

@login_required
def project_detail(request, project_id=0):
    # """ if debug: print >> sys.stderr,'Called '+sys._getframe().f_code.co_name """
    template = 'projects/project_detail.html'

    ownedProjects = request.user.project_set.all().filter(active=True)
    sharedProjects = Project.objects.filter(shared__matched_user=request.user, shared__active=True, active=True)
    publicProjects = Project.objects.all().filter(is_public=True,active=True)

    projects = ownedProjects | sharedProjects | publicProjects
    projects = projects.distinct()

    proj = projects.get(id=project_id)

    shared = None
    if proj.owner.id != request.user.id and not proj.is_public:
        shared = request.user.shared_resource_set.get(project__id=project_id)

    proj.mark_viewed(request)
    context = {
        'project': proj,
        'studies': proj.study_set.all().filter(active=True),
        'shared': shared
    }
    return render(request, template, context)

@login_required
def request_project(request):
    send_mail(
            'request@' + settings.PROJECT_NAME + '.appspotmail.com',
            settings.REQUEST_PROJECT_EMAIL,
            'User has requested a Google Project',
            '''
The user %s has requested a new Google Project be created. Here is their message:

%s
    ''' % (request.user.email, request.POST['message']))

    template = 'projects/project_request.html'
    context = {
        'requested': True
    }
    return render(request, template, context)

def get_storage_string(size):
    if size > 1000000000 :
        string = str(size / 1000000000) + " GB"
    elif size > 1000000 :
        string = str(size / 1000000) + " MB"
    elif size > 1000 :
        string = str(size / 1000) + " kB"
    else :
        string = str(size) + " b"
    return string

@login_required
def project_upload(request):
    template = 'projects/project_upload.html'

    if not hasattr(request.user, 'googleproject'):
        if settings.FORCE_SINGLE_GOOGLE_ACCOUNT:
            proj = GoogleProject(user=request.user,
                                 project_name=settings.PROJECT_NAME,
                                 project_id=settings.PROJECT_ID,
                                 big_query_dataset=settings.BQ_PROJECT_ID)
            proj.save()

            buck = Bucket(user = request.user,
                          bucket_name=settings.GCLOUD_BUCKET)
            buck.save()
        else :
            template = 'projects/project_request.html'


    usage = get_storage_string(request.user.usage.usage_bytes)
    max_usage = get_storage_string(request.user.usage.usage_bytes_max)

    projects = request.user.project_set.all().filter(active=True)
    context = {
        'usage_monitoring_enabled' : settings.ENFORCE_USER_STORAGE_SIZE,
        'usage_size'  : request.user.usage.usage_bytes,
        'usage'  : usage,
        'max_usage' : max_usage,
        'max_usage_size' : request.user.usage.usage_bytes_max,
        'requested': False,
        'projects': projects
    }
    return render(request, template, context)

def filter_column_name(original):
    return re.sub(r"[^a-zA-Z]+", "_", original.lower())

def create_metadata_tables(user, study, columns, skipSamples=False):
    with connection.cursor() as cursor:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_metadata_%s_%s (
              id INTEGER UNSIGNED AUTO_INCREMENT PRIMARY KEY,
              study_id INTEGER UNSIGNED,
              sample_barcode VARCHAR(200),
              file_path VARCHAR(200),
              file_name VARCHAR(200),
              data_type VARCHAR(200),
              pipeline VARCHAR(200),
              platform VARCHAR(200)
            )
        """, [user.id, study.id])

        if not skipSamples:
            feature_table_sql = """
                CREATE TABLE IF NOT EXISTS user_metadata_samples_%s_%s (
                  id INTEGER UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                  participant_barcode VARCHAR(200),
                  sample_barcode VARCHAR(200) UNIQUE,
                  has_mrna BOOLEAN,
                  has_mirna BOOLEAN,
                  has_protein BOOLEAN,
                  has_meth BOOLEAN
            """
            feature_table_args = [user.id, study.id]

            for column in columns:
                feature_table_sql += ", " + filter_column_name(column['name']) + " " + column['type']

            feature_table_sql += ")"
            cursor.execute(feature_table_sql, feature_table_args)

def complete_download(request, file_descriptor_list):
    status = 'success'
    message = None

    proj = None
    study = None

    # TODO: Validation
    if request.POST['project-type'] == 'new':
        proj = request.user.project_set.create(name=request.POST['project-name'], description=request.POST['project-description'])
        proj.save()
    else:
        proj = request.user.project_set.all().filter(id=request.POST['project-id'])[0]

    if proj is None:
        status = 'error'
        message = 'Unable to create project'
    else:
        study = proj.study_set.create(
            name=request.POST['study-name'],
            description=request.POST['study-description'],
            owner=request.user
        )

        if request.POST['data-type'] == 'extend':
            # TODO Does this need a share check??
            study.extends_id = request.POST['extend-study-id']

        study.save()

        upload = UserUpload(owner=request.user)
        upload.save()
        config = {
            "USER_PROJECT": proj.id,
            "USER_ID": request.user.id,
            "STUDY": study.id,
            "BUCKET": request.user.bucket_set.all()[0].bucket_name,
            "GOOGLE_PROJECT": request.user.googleproject.project_name,
            "BIGQUERY_DATASET": request.user.googleproject.big_query_dataset,
            "FILES": [],
            "USER_METADATA_TABLES": {
                "METADATA_DATA" : "user_metadata_" + str(request.user.id) + "_" + str(study.id),
                "METADATA_SAMPLES" : "user_metadata_samples_" + str(request.user.id) + "_" + str(study.id),
                "FEATURE_DEFS": User_Feature_Definitions._meta.db_table
            }
        }

        all_columns = []
        for file_obj in file_descriptor_list:
            file = file_obj['file']
            file_upload = UserUploadedFile(upload=upload, file=file, bucket=config['BUCKET'])
            file_upload.save()

            fileJSON = {
                "FILENAME": file_upload.file.name,
                "PLATFORM": file_obj['descriptor']['platform'],
                "PIPELINE": file_obj['descriptor']['pipeline'],
                "BIGQUERY_TABLE_NAME": "cgc_" + ("user" if file_obj['datatype'] == 'user_gen' else file_obj['datatype']) +
                                       "_" + str(proj.id) + "_" + str(study.id),
                "DATATYPE": file_obj['datatype'],
                "COLUMNS": []
            }

            if file_obj['datatype'] == "user_gen":
                for column in file_obj['descriptor']['columns']:
                    if column['ignored']:
                        continue

                    type = column['type']
                    if type == 'string' or type == 'url' or type == 'file':
                        type = 'VARCHAR(200)'
                    else:
                        type = filter_column_name(type)

                    controlled = None
                    shared_id = None
                    if 'controlled' in column and column['controlled'] is not None:
                        controlled = column['controlled']['key']
                        shared_id = "CLIN:" + controlled # All shared IDs at the moment are clinical TCGA
                    else:
                        controlled = filter_column_name(column['name'])

                    fileJSON['COLUMNS'].append({
                        "NAME"      : column['name'],
                        "TYPE"      : type,
                        "INDEX"     : column['index'],
                        "MAP_TO"    : controlled,
                        "SHARED_ID" : shared_id
                    })

                    all_columns.append({
                        "name": column['name'],
                        "type": type
                    })

            config['FILES'].append(fileJSON)

        #Skip *_samples table for low level data
        create_metadata_tables(request.user, study, all_columns, request.POST['data-type'] == 'low')

        dataset = request.user.user_data_tables_set.create(
            study=study,
            metadata_data_table=config['USER_METADATA_TABLES']['METADATA_DATA'],
            metadata_samples_table=config['USER_METADATA_TABLES']['METADATA_SAMPLES'],
            data_upload=upload,
            google_project=request.user.googleproject,
            google_bucket=request.user.bucket_set.all()[0]
        )

        if settings.PROCESSING_ENABLED:
            files = {'config.json': ('config.json', json.dumps(config))}
            post_args = {
                'project_id'    : proj.id,
                'study_id'      : study.id,
                'dataset_id'    : dataset.id
            }
            success_url = reverse('study_data_success', kwargs=post_args) + '?key=' + upload.key
            failure_url = reverse('study_data_error', kwargs=post_args) + '?key=' + upload.key
            parameters = {
                'SUCCESS_POST_URL': request.build_absolute_uri( success_url ),
                'FAILURE_POST_URL': request.build_absolute_uri( failure_url )
            }
            r = requests.post(settings.PROCESSING_JENKINS_URL + '/job/' + settings.PROCESSING_JENKINS_PROJECT + '/buildWithParameters',
                              files=files, params=parameters,
                              auth=(settings.PROCESSING_JENKINS_USER, settings.PROCESSING_JENKINS_PASSWORD))

            if r.status_code < 400:
                upload.status = 'Processing'
                upload.jobURL = r.headers['Location']
            else:
                upload.status = 'Error Initializing'

            upload.save()

        #update usage on the users account
        if settings.ENFORCE_USER_STORAGE_SIZE :
            total_file_size = 0
            for file in file_descriptor_list:
                total_file_size += int(file['size'])

            #update the user's account usage
            request.user.usage.usage_bytes = request.user.usage.usage_bytes + total_file_size
            request.user.usage.save()

    resp = {
        'status': status,
        'message': message
    }
    if status is "success":
        resp['redirect_url'] = '/projects/' + str(proj.id) + '/'

    return resp

@login_required
def project_delete(request, project_id=0):
    proj = request.user.project_set.get(id=project_id)
    proj.active = False
    proj.save()

    #deactivate all studies as well
    studies = proj.study_set.all()
    for study in studies:
        study.active = False
        study.save()
        usage = request.user.usage
        usage.usage_bytes = usage.usage_bytes - study.get_storage_size()
        usage.save()

    return JsonResponse({
        'status': 'success'
    })

@login_required
def project_edit(request, project_id=0):
    name = request.POST['name']
    description = request.POST['description']

    if not name:
        raise Exception("Projects cannot have an empty name")

    proj = request.user.project_set.get(id=project_id)
    proj.name = name
    proj.description = description
    proj.save()

    return JsonResponse({
        'status': 'success'
    })

@login_required
def project_share(request, project_id=0):
    proj = request.user.project_set.get(id=project_id)
    emails = re.split('\s*,\s*', request.POST['share_users'].strip())

    create_share(request, proj, emails, 'Project')

    return JsonResponse({
        'status': 'success'
    })

@login_required
def study_delete(request, project_id=0, study_id=0):
    proj = request.user.project_set.get(id=project_id)
    study = proj.study_set.get(id=study_id)
    study.active = False
    study.save()

    #subtract usage from total
    usage = request.user.usage
    usage.usage_bytes = usage.usage_bytes - study.get_storage_size()
    usage.save()

    return JsonResponse({
        'status': 'success'
    })

@login_required
def study_edit(request, project_id=0, study_id=0):
    name = request.POST['name']
    description = request.POST['description']

    if not name:
        raise Exception("Projects cannot have an empty name")

    proj = request.user.project_set.get(id=project_id)
    study = proj.study_set.get(id=study_id)
    study.name = name
    study.description = description
    study.save()

    return JsonResponse({
        'status': 'success'
    })

def study_data_success(request, project_id=0, study_id=0, dataset_id=0):
    proj = Project.objects.get(id=project_id)
    study = proj.study_set.get(id=study_id)
    datatables = study.user_data_tables_set.get(id=dataset_id)

    if not datatables.data_upload.key == request.GET.get('key'):
        raise Exception("Invalid data key when marking data success")

    ufds = User_Feature_Definitions.objects.filter(study_id=study.id)
    cursor = connection.cursor()

    for user_feature in ufds:
        if ' ' in user_feature.feature_name:
            # Molecular data will not be column names but rather names of features
            continue
        col_name = filter_column_name(user_feature.feature_name)

        cursor.execute('SELECT COUNT(1) AS "count", '+ col_name +' AS "val" FROM ' + datatables.metadata_samples_table)
        values = cursor.fetchall()

        for value in values:
            ufc = User_Feature_Counts.objects.create(feature=user_feature, value=value[1], count=value[0])
            ufc.save()

    cursor.close()

    datatables.data_upload.status = 'Complete'
    datatables.data_upload.save()

    return JsonResponse({
        'status': 'success'
    })

def study_data_error(request, project_id=0, study_id=0, dataset_id=0):
    proj = Project.objects.get(id=project_id)
    study = proj.study_set.get(id=study_id)
    datatables = study.user_data_tables_set.get(id=dataset_id)

    if not datatables.data_upload.key == request.GET.get('key'):
        raise Exception("Invalid data key when marking data success")

    datatables.data_upload.status = 'Error'
    datatables.data_upload.save()

    return JsonResponse({
        'status': 'success'
    })

#this file will accept a list of files and render a process to create or extend a project
#login required will force redirect to login page, however how to we send the parameters
#
# e.g. LSDF_BaseSpaceEndpoint.py?action=trigger&appsessionuri=v1pre3/appsessions/32597636&authorization_code=fdf8a49ad47840cfbaa74c07f2c0a9a2
#The client secret code for the BS test app is: bs['client_secret'] =
## FOR TESTING PURPOSES ONLY
@login_required
def import_auth(request):
    redirect_url = request.get_host() + reverse('accept_external_files')
    if request.is_secure():
        redirect_url = "https://" + redirect_url
    else :
        redirect_url = "http://" + redirect_url

    auth_url = 'https://basespace.illumina.com/oauth/authorize'
    params   = {'client_id'     : settings.BASESPACE_APP_ID,
                'redirect_uri'  : redirect_url,
                'response_type' : 'code'}

    print >> sys.stderr, auth_url+"?"+urllib.urlencode(params)
    return redirect(auth_url+"?"+urllib.urlencode(params))

basespace_app_secret = settings.BASESPACE_APP_SECRET
basespace_app_id     = settings.BASESPACE_APP_ID
basespace_api_uri    = 'https://api.basespace.illumina.com/'
basespace_api_domain = 'api.basespace.illumina.com/'
basespace_auth_uri   = 'https://api.basespace.illumina.com/v1pre3/oauthv2/token'

#
# acquire a basespace access token
#
def get_basespace_access_token(app_id, app_secret, redirect_url, auth_code):
    params = {  'client_id'     : app_id,
                'client_secret' : app_secret,
                'grant_type'    : 'authorization_code',
                'redirect_uri'  : redirect_url,
                'code'          : auth_code }

    params_enc = urllib.urlencode(params)
    response = urllib.urlopen(basespace_auth_uri, params_enc)
    response = json.loads( response.read())

    access_token = False
    if 'access_token' in response :
        access_token = response['access_token']
    elif 'error' in response :
        print >> sys.stderr, 'ERROR : ' + response['error'] + " reason : " + response['error_description']

    return access_token


@login_required
def import_files(request):
    template = 'projects/project_select.html'
    context = {}
    if request.method == "GET" :
        appsession_uri       = request.GET['appsessionuri']  #appsessionuri=v1pre3/appsessions/{AppSessionId}
        authorization_code   = request.GET['authorization_code']

        redirect_url         = request.get_host() + reverse('accept_external_files')
        if request.is_secure():
            redirect_url = "https://" + redirect_url
        else :
            redirect_url = "http://" + redirect_url
        #redirect_url         = 'https://db.systemsbiology.net/devDC/sbeams/cgi/Skunkworks/LSDF_BaseSpaceEndpoint.py' #authorization key expired

        # a) use authorization_code plus the app private key (mentioned in previous email) to request an access_token.
        access_token = get_basespace_access_token(basespace_app_id, basespace_app_secret, redirect_url, authorization_code)

        if access_token :
            # b) fetch appsession info (JSON object), including list of files
            session_uri = basespace_api_uri + appsession_uri + '?access_token=' + access_token
            session_resp = urllib.urlopen(session_uri)
            session_dict = json.loads(session_resp.read())

            # c) fetch files themselves
            files = []
            bs_project = {}

            if 'Response' in session_dict.keys():
                references = session_dict['Response']['References']
                for ref in references:
                    if ref['Type'] == 'Project':
                        bs_project = {'name'        : ref['Content']['Name'],
                                      'description' : ref['Content']['Description']}
                    elif ref['Type'] == 'File':
                        files.append({"name"    : str(ref['Content']['Name']),
                                      "size"    : get_storage_string(ref['Content']['Size']),
                                      "rawsize" : str(ref['Content']['Size']),
                                      "id"      : str(ref['Content']['Id']),
                                      "href"    : str(ref['HrefContent'])})

            ownedProjects = request.user.project_set.all().filter(active=True)
            context = {'projects'     : ownedProjects,
                       'files'        : files,
                       'bs_project'   : bs_project,
                       'session_uri'  : appsession_uri,
                       'access_token' : access_token}


            return render(request, template, context)
        else :
            return HttpResponseNotFound('<h1>Access not authorized by Basespace</h1>')
    else :
        return HttpResponseNotFound('<h1>Page not found</h1>')

#Accept file upload from web upload form
@login_required
def upload_files(request):
    file_descriptor_list = []
    for formfield in request.FILES :
        file       = request.FILES[formfield]
        descriptor = json.loads(request.POST[formfield + '_desc'])
        datatype   = request.POST[formfield + '_type']
        file_descriptor_list.append({'file' : file, 'descriptor' : descriptor, 'datatype' : datatype, 'size' : file.size})

    return JsonResponse(complete_download(request, file_descriptor_list))

#Accept project selection for Basespace import
def upload_basespace_files(request):
    file_descriptor_list = []

    #TODO check for limit on file size
    if request.method == "POST" :
        access_token = request.POST['access_token']
        session_uri  = request.POST['session_uri']
        files = json.loads(request.POST['files'])
        for file in files:
            file_name = file['name']
            file_fetch_uri = basespace_api_uri + file['href'] + '/content?access_token=' + access_token
            wf = urllib.urlopen( file_fetch_uri )
            importedFile = ContentFile(wf.read(), file_name)
            wf.close()

            descriptor = {'pipeline' : "vcf_pipeline", 'platform' : 'vcf_platform', 'column' : []}
            datatype   = 'vcf_file'
            file_descriptor_list.append({'file' : importedFile, 'descriptor' : descriptor, 'datatype' : datatype, 'size' : file['size']})

        result = complete_download(request, file_descriptor_list)

        if result :
            basespace_response = write_response_to_basespace(result, access_token, session_uri)
            appession_id  = session_uri.split( "/" )[2]
            result["redirect_url"] = 'https://basespace.illumina.com/analyses/' + appession_id

        return JsonResponse(result)
    else :
        return HttpResponseNotFound('<h1>Page not found</h1>')


def write_response_to_basespace(result, access_token, session_uri):
    status_params = { 'Status'          : "Complete", #result['status'],
                      'Statussummary'   : 'import complete'}
    status_params_enc = urllib.urlencode(status_params)

    session_uri.split( "/" )
    h = httplib.HTTPSConnection(basespace_api_domain)
    headers = {"x-access-token" : access_token, "Accept": "text/plain"}
    h.request('POST', session_uri, status_params_enc, headers)
    r = h.getresponse()

    return r

#session structure returned
# {
# 	"Notifications": [],
# 	"ResponseStatus": {},
# 	"Response": {
# 		"StatusSummary": "",
# 		"References": [{
# 			"Rel": "Input",
# 			"Href": "v1pre3/projects/28460436",
# 			"Type": "Project",
# 			"HrefContent": "v1pre3/projects/28460436",
# 			"Content": {
# 				"HasCollaborators": false,
# 				"TotalSize": 0,
# 				"DateModified": "2016-02-08T18:12:38.0000000",
# 				"UserOwnedBy": {
# 					"Href": "v1pre3/users/7614612",
# 					"Name": "Ross Bohner",
# 					"DateCreated": "0001-01-01T00:00:00.0000000",
# 					"GravatarUrl": "https://secure.gravatar.com/avatar/51b8fa9209be39516b28893f673b97a6.jpg?s=20&d=https%3a%2f%2fbasespace.illumina.com%2fpublic%2fimages%2fDefaultCustomerGravatar.png&r=PG",
# 					"Id": "7614612"
# 				},
# 				"Name": "LSDF File Download App",
# 				"DateCreated": "2016-02-08T18:12:38.0000000",
# 				"Href": "v1pre3/projects/28460436",
# 				"Id": "28460436",
# 				"Description": "This is the app needed to for LSDF to call Basespace and retrieve user's bs files.  Note that this is a test app and the actual implementation should use the app id of the Basespace application that posts filenames to LSDF endpoint"
# 			}
# 		}],
# 		"Properties": {
# 			"Href": "v1pre3/appsessions/32627092/properties",
# 			"TotalCount": 4,
# 			"DisplayedCount": 4,
# 			"Items": [{
# 				"Href": "v1pre3/appsessions/32627092/properties/Input.project-id",
# 				"Type": "project",
# 				"Description": "Project",
# 				"Content": {
# 					"HasCollaborators": false,
# 					"TotalSize": 0,
# 					"DateModified": "2016-02-08T18:12:38.0000000",
# 					"UserOwnedBy": {
# 						"Href": "v1pre3/users/7614612",
# 						"Name": "Ross Bohner",
# 						"DateCreated": "0001-01-01T00:00:00.0000000",
# 						"GravatarUrl": "https://secure.gravatar.com/avatar/51b8fa9209be39516b28893f673b97a6.jpg?s=20&d=https%3a%2f%2fbasespace.illumina.com%2fpublic%2fimages%2fDefaultCustomerGravatar.png&r=PG",
# 						"Id": "7614612"
# 					},
# 					"Name": "LSDF File Download App",
# 					"DateCreated": "2016-02-08T18:12:38.0000000",
# 					"Href": "v1pre3/projects/28460436",
# 					"Id": "28460436",
# 					"Description": "This is the app needed to for LSDF to call Basespace and retrieve user's bs files.  Note that this is a test app and the actual implementation should use the app id of the Basespace application that posts filenames to LSDF endpoint"
# 				},
# 				"Name": "Input.project-id"
# 			}, {
# 				"Name": "Input.project-id.attributes",
# 				"ItemsTotalCount": 1,
# 				"Items": [
# 					[{
# 						"Key": "FieldId",
# 						"Values": ["project-id"]
# 					}, {
# 						"Key": "ResourceType",
# 						"Values": ["project"]
# 					}, {
# 						"Key": "ResourceId",
# 						"Values": ["28460436"]
# 					}, {
# 						"Key": "ResourceHref",
# 						"Values": ["v1pre3/projects/28460436"]
# 					}]
# 				],
# 				"Href": "v1pre3/appsessions/32627092/properties/Input.project-id.attributes",
# 				"Type": "map[]",
# 				"ItemsDisplayedCount": 1,
# 				"HrefItems": "v1pre3/appsessions/32627092/properties/Input.project-id.attributes/items",
# 				"Description": "Project Attributes"
# 			}, {
# 				"Name": "Input.Projects",
# 				"ItemsTotalCount": 1,
# 				"Items": [{
# 					"HasCollaborators": false,
# 					"TotalSize": 0,
# 					"DateModified": "2016-02-08T18:12:38.0000000",
# 					"UserOwnedBy": {
# 						"Href": "v1pre3/users/7614612",
# 						"Name": "Ross Bohner",
# 						"DateCreated": "0001-01-01T00:00:00.0000000",
# 						"GravatarUrl": "https://secure.gravatar.com/avatar/51b8fa9209be39516b28893f673b97a6.jpg?s=20&d=https%3a%2f%2fbasespace.illumina.com%2fpublic%2fimages%2fDefaultCustomerGravatar.png&r=PG",
# 						"Id": "7614612"
# 					},
# 					"Name": "LSDF File Download App",
# 					"DateCreated": "2016-02-08T18:12:38.0000000",
# 					"Href": "v1pre3/projects/28460436",
# 					"Id": "28460436",
# 					"Description": "This is the app needed to for LSDF to call Basespace and retrieve user's bs files.  Note that this is a test app and the actual implementation should use the app id of the Basespace application that posts filenames to LSDF endpoint"
# 				}],
# 				"Href": "v1pre3/appsessions/32627092/properties/Input.Projects",
# 				"Type": "project[]",
# 				"ItemsDisplayedCount": 1,
# 				"HrefItems": "v1pre3/appsessions/32627092/properties/Input.Projects/items",
# 				"Description": ""
# 			}, {
# 				"Name": "Output.Projects",
# 				"ItemsTotalCount": 0,
# 				"Items": [],
# 				"Href": "v1pre3/appsessions/32627092/properties/Output.Projects",
# 				"Type": "project[]",
# 				"ItemsDisplayedCount": 0,
# 				"HrefItems": "v1pre3/appsessions/32627092/properties/Output.Projects/items",
# 				"Description": ""
# 			}]
# 		},
# 		"Name": "Test LSDF App",
# 		"Application": {
# 			"AppFamilySlug": "blink-ux.test-lsdf-app",
# 			"PublishStatus": "Development",
# 			"Classifications": ["Quality"],
# 			"DateCreated": "2016-02-09T21:31:50.0000000",
# 			"Category": "Other",
# 			"Name": "Test LSDF App",
# 			"ShortDescription": "This is a temporary application used for LSDF testing",
# 			"CompanyName": "Blink UX",
# 			"Features": [],
# 			"Href": "v1pre3/applications/2550548",
# 			"IsBillingActivated": false,
# 			"VersionNumber": "1.0.0",
# 			"AppVersionSlug": "blink-ux.test-lsdf-app.1.0.0",
# 			"Id": "2550548"
# 		},
# 		"DateCreated": "2016-02-10T00:02:09.0000000",
# 		"UserCreatedBy": {
# 			"Href": "v1pre3/users/7614612",
# 			"Name": "Ross Bohner",
# 			"DateCreated": "0001-01-01T00:00:00.0000000",
# 			"GravatarUrl": "https://secure.gravatar.com/avatar/51b8fa9209be39516b28893f673b97a6.jpg?s=20&d=https%3a%2f%2fbasespace.illumina.com%2fpublic%2fimages%2fDefaultCustomerGravatar.png&r=PG",
# 			"Id": "7614612"
# 		},
# 		"Href": "v1pre3/appsessions/32627092",
# 		"Status": "Running",
# 		"OriginatingUri": "https://basespace.illumina.com",
# 		"ModifiedOn": "2016-02-10T00:02:13.0000000",
# 		"Id": "32627092"
# 	}
# }