# openapi_client.KancelarieApi

All URIs are relative to *http://127.0.0.1:8000/api/v1*

Method | HTTP request | Description
------------- | ------------- | -------------
[**create_kancelaria**](KancelarieApi.md#create_kancelaria) | **POST** /kancelarie | Create a new law firm
[**delete_kancelaria**](KancelarieApi.md#delete_kancelaria) | **DELETE** /kancelarie/{kancelaria_id} | Delete a law firm by ID
[**read_kancelaria**](KancelarieApi.md#read_kancelaria) | **GET** /kancelarie/{kancelaria_id} | Retrieve a specific law firm by ID
[**read_kancelarie**](KancelarieApi.md#read_kancelarie) | **GET** /kancelarie | Retrieve all law firms
[**update_kancelaria**](KancelarieApi.md#update_kancelaria) | **PUT** /kancelarie/{kancelaria_id} | Update an existing law firm by ID


# **create_kancelaria**
> KancelariaInDB create_kancelaria(kancelaria_create)

Create a new law firm

### Example

* OAuth Authentication (OAuth2PasswordBearer):

```python
import openapi_client
from openapi_client.models.kancelaria_create import KancelariaCreate
from openapi_client.models.kancelaria_in_db import KancelariaInDB
from openapi_client.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to http://127.0.0.1:8000/api/v1
# See configuration.py for a list of all supported configuration parameters.
configuration = openapi_client.Configuration(
    host = "http://127.0.0.1:8000/api/v1"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

configuration.access_token = os.environ["ACCESS_TOKEN"]

# Enter a context with an instance of the API client
with openapi_client.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = openapi_client.KancelarieApi(api_client)
    kancelaria_create = openapi_client.KancelariaCreate() # KancelariaCreate | 

    try:
        # Create a new law firm
        api_response = api_instance.create_kancelaria(kancelaria_create)
        print("The response of KancelarieApi->create_kancelaria:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling KancelarieApi->create_kancelaria: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **kancelaria_create** | [**KancelariaCreate**](KancelariaCreate.md)|  | 

### Return type

[**KancelariaInDB**](KancelariaInDB.md)

### Authorization

[OAuth2PasswordBearer](../README.md#OAuth2PasswordBearer)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**201** | Successful Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **delete_kancelaria**
> delete_kancelaria(kancelaria_id)

Delete a law firm by ID

### Example

* OAuth Authentication (OAuth2PasswordBearer):

```python
import openapi_client
from openapi_client.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to http://127.0.0.1:8000/api/v1
# See configuration.py for a list of all supported configuration parameters.
configuration = openapi_client.Configuration(
    host = "http://127.0.0.1:8000/api/v1"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

configuration.access_token = os.environ["ACCESS_TOKEN"]

# Enter a context with an instance of the API client
with openapi_client.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = openapi_client.KancelarieApi(api_client)
    kancelaria_id = 56 # int | The ID of the law firm to delete.

    try:
        # Delete a law firm by ID
        api_instance.delete_kancelaria(kancelaria_id)
    except Exception as e:
        print("Exception when calling KancelarieApi->delete_kancelaria: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **kancelaria_id** | **int**| The ID of the law firm to delete. | 

### Return type

void (empty response body)

### Authorization

[OAuth2PasswordBearer](../README.md#OAuth2PasswordBearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**204** | Successful Response (No Content) |  -  |
**404** | Kancelaria not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **read_kancelaria**
> KancelariaInDB read_kancelaria(kancelaria_id)

Retrieve a specific law firm by ID

### Example

* OAuth Authentication (OAuth2PasswordBearer):

```python
import openapi_client
from openapi_client.models.kancelaria_in_db import KancelariaInDB
from openapi_client.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to http://127.0.0.1:8000/api/v1
# See configuration.py for a list of all supported configuration parameters.
configuration = openapi_client.Configuration(
    host = "http://127.0.0.1:8000/api/v1"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

configuration.access_token = os.environ["ACCESS_TOKEN"]

# Enter a context with an instance of the API client
with openapi_client.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = openapi_client.KancelarieApi(api_client)
    kancelaria_id = 56 # int | The ID of the law firm to retrieve.

    try:
        # Retrieve a specific law firm by ID
        api_response = api_instance.read_kancelaria(kancelaria_id)
        print("The response of KancelarieApi->read_kancelaria:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling KancelarieApi->read_kancelaria: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **kancelaria_id** | **int**| The ID of the law firm to retrieve. | 

### Return type

[**KancelariaInDB**](KancelariaInDB.md)

### Authorization

[OAuth2PasswordBearer](../README.md#OAuth2PasswordBearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successful Response |  -  |
**404** | Kancelaria not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **read_kancelarie**
> List[KancelariaInDB] read_kancelarie()

Retrieve all law firms

### Example

* OAuth Authentication (OAuth2PasswordBearer):

```python
import openapi_client
from openapi_client.models.kancelaria_in_db import KancelariaInDB
from openapi_client.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to http://127.0.0.1:8000/api/v1
# See configuration.py for a list of all supported configuration parameters.
configuration = openapi_client.Configuration(
    host = "http://127.0.0.1:8000/api/v1"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

configuration.access_token = os.environ["ACCESS_TOKEN"]

# Enter a context with an instance of the API client
with openapi_client.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = openapi_client.KancelarieApi(api_client)

    try:
        # Retrieve all law firms
        api_response = api_instance.read_kancelarie()
        print("The response of KancelarieApi->read_kancelarie:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling KancelarieApi->read_kancelarie: %s\n" % e)
```



### Parameters

This endpoint does not need any parameter.

### Return type

[**List[KancelariaInDB]**](KancelariaInDB.md)

### Authorization

[OAuth2PasswordBearer](../README.md#OAuth2PasswordBearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successful Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **update_kancelaria**
> KancelariaInDB update_kancelaria(kancelaria_id, kancelaria_update)

Update an existing law firm by ID

### Example

* OAuth Authentication (OAuth2PasswordBearer):

```python
import openapi_client
from openapi_client.models.kancelaria_in_db import KancelariaInDB
from openapi_client.models.kancelaria_update import KancelariaUpdate
from openapi_client.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to http://127.0.0.1:8000/api/v1
# See configuration.py for a list of all supported configuration parameters.
configuration = openapi_client.Configuration(
    host = "http://127.0.0.1:8000/api/v1"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

configuration.access_token = os.environ["ACCESS_TOKEN"]

# Enter a context with an instance of the API client
with openapi_client.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = openapi_client.KancelarieApi(api_client)
    kancelaria_id = 56 # int | The ID of the law firm to update.
    kancelaria_update = openapi_client.KancelariaUpdate() # KancelariaUpdate | 

    try:
        # Update an existing law firm by ID
        api_response = api_instance.update_kancelaria(kancelaria_id, kancelaria_update)
        print("The response of KancelarieApi->update_kancelaria:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling KancelarieApi->update_kancelaria: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **kancelaria_id** | **int**| The ID of the law firm to update. | 
 **kancelaria_update** | [**KancelariaUpdate**](KancelariaUpdate.md)|  | 

### Return type

[**KancelariaInDB**](KancelariaInDB.md)

### Authorization

[OAuth2PasswordBearer](../README.md#OAuth2PasswordBearer)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successful Response |  -  |
**404** | Kancelaria not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

